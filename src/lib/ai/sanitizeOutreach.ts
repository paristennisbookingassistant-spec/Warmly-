/**
 * sanitizeOutreach.ts
 *
 * Deterministic post-processing for outreach-family artifacts. Runs AFTER
 * the LLM generates JSON, BEFORE we return it to the caller.
 *
 * Why this exists:
 *   The system prompt tells the model "no em-dashes" and "300 char max"
 *   but MiniMax doesn't reliably follow those rules. Defense in depth:
 *   keep the prompt instructions (they catch most cases), then enforce
 *   the hard rules in code where the model can't override them.
 *
 * Scope (intentionally minimal):
 *   1. Strip em-dashes (—) and en-dashes (–) — replace with ", "
 *   2. Truncate connection_note messages to 300 chars at sentence boundary
 *   3. Recompute char_count from the actual sanitized message
 *
 * Things this does NOT do (yet — add only if real bugs surface):
 *   - Strip forbidden openers ("I hope this finds you well")
 *   - Detect and reject forbidden vocabulary ("leverage", "synergy")
 *   - Retry generation if quality is poor
 *
 * Adding more rules: keep them deterministic. Anything that needs
 * judgement belongs in the prompt, not here.
 */

import type { ArtifactType } from "@/types/artifacts";

const OUTREACH_TYPES: ArtifactType[] = [
  "connection_note",
  "outreach_draft",
  "follow_up_draft",
];

/**
 * Connection note hard limit — LinkedIn enforces 300 chars on the
 * connection request note field. Anything longer is silently truncated
 * by LinkedIn, which can chop the message mid-sentence.
 */
const CONNECTION_NOTE_MAX_CHARS = 300;

/**
 * Result of sanitization. `warnings` is for logging — non-fatal notes
 * about what was changed. `message` is the final cleaned text.
 */
export interface SanitizeResult {
  message: string;
  warnings: string[];
}

/**
 * Replace em-dashes and en-dashes with ", " (comma + space).
 *
 * Why ", " and not just "," or " — ":
 *   In English prose, an em-dash usually plays the role of a parenthetical
 *   pause that a comma also covers. "I love this — really" → "I love this,
 *   really" reads natural. Replacing with just "," skips the breathing
 *   space; replacing with " - " (hyphen) is also an AI tell.
 *
 * After replacement we collapse any double spaces that result.
 */
export function stripDashes(text: string): { text: string; changed: boolean } {
  const original = text;
  // Match the dash AND any horizontal whitespace around it, so
  //   "this — really"  → "this, really"   (not "this , really")
  //   "Hi—you"         → "Hi, you"
  //   "2020 – 2024"    → "2020, 2024"
  // — = em-dash, – = en-dash. Using char class avoids the
  // need to source-escape literal dashes.
  const cleaned = text
    .replace(/[ \t]*[—–][ \t]*/g, ", ")
    .replace(/[ \t]+/g, " ")
    .trim();
  return { text: cleaned, changed: cleaned !== original };
}

/**
 * Truncate a message to fit within `maxChars`, preferring sentence-ending
 * punctuation as the cut point. Falls back to last word boundary, then
 * to a hard cut as a last resort.
 *
 * Examples (maxChars = 300):
 *   "Hi Marie. Loved your post on AI. Would love to connect. ...300+ more chars"
 *   → "Hi Marie. Loved your post on AI. Would love to connect."
 */
export function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Look for last "." / "!" / "?" followed by space within the limit
  // We cap the search at maxChars so we never cross the limit.
  const window = text.slice(0, maxChars);
  const sentenceEnders = [". ", "! ", "? ", ".\n", "!\n", "?\n"];
  let bestEnd = -1;
  for (const sep of sentenceEnders) {
    const idx = window.lastIndexOf(sep);
    if (idx > bestEnd) bestEnd = idx;
  }
  if (bestEnd > 0) {
    // Include the ending punctuation but drop the trailing space
    return text.slice(0, bestEnd + 1).trim();
  }

  // No sentence end found — cut at last word boundary
  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace > 0) {
    return text.slice(0, lastSpace).trim();
  }

  // Hard cut (very rare — message has no spaces in first 300 chars)
  return text.slice(0, maxChars);
}

/**
 * Returns true if this artifact type is in the outreach family
 * (i.e. should run through this sanitizer).
 */
export function isOutreachArtifactType(type: ArtifactType): boolean {
  return OUTREACH_TYPES.includes(type);
}

/**
 * Top-level entry point. Sanitizes the `message` field of an outreach
 * artifact's content object, recomputes `char_count`, and returns
 * warnings for logging.
 *
 * Mutates a copy of `content` — does not touch the original.
 */
export function sanitizeOutreachContent(
  artifactType: ArtifactType,
  content: Record<string, unknown>
): { content: Record<string, unknown>; warnings: string[] } {
  if (!isOutreachArtifactType(artifactType)) {
    return { content, warnings: [] };
  }

  const warnings: string[] = [];
  const next: Record<string, unknown> = { ...content };

  // 1. Sanitize the message field if present and a string
  if (typeof next.message === "string") {
    const original = next.message;

    // Strip dashes
    const dashResult = stripDashes(original);
    let cleaned = dashResult.text;
    if (dashResult.changed) {
      warnings.push("stripped em-dash or en-dash");
    }

    // For connection_note: enforce 300-char hard limit
    if (
      artifactType === "connection_note" &&
      cleaned.length > CONNECTION_NOTE_MAX_CHARS
    ) {
      const before = cleaned.length;
      cleaned = truncateAtSentence(cleaned, CONNECTION_NOTE_MAX_CHARS);
      warnings.push(
        `truncated connection_note from ${before} to ${cleaned.length} chars`
      );
    }

    next.message = cleaned;
  }

  // 2. Recompute char_count from the (possibly modified) message
  if (typeof next.message === "string") {
    next.char_count = next.message.length;
  }

  return { content: next, warnings };
}
