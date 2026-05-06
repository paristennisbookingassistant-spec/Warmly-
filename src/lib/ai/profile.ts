/**
 * ai/profile.ts
 *
 * Auto-builds and enriches the per-user `profile_md` identity narrative.
 *
 * The narrative is generated from:
 *   - Structured onboarding answers (career_history, education, goals)
 *   - Free-form context the user provides (about-yourself, networking goal)
 *   - Optional CV / cover letter / past messages text
 *   - Ongoing chat content (passively, when the user reveals new identity facts)
 *
 * It captures the things that matter for outreach but don't fit into
 * structured fields:
 *   - The user's transition narrative ("7 yrs at Monitor → exploring VC/PE")
 *   - Networking hooks per recipient type ("for VC contacts: pharma + China-FR
 *     background; for AI contacts: INSEAD AI Club lead")
 *   - Specific phrases the user uses ("I'm at a crossroad after 7 years…")
 *   - Languages, geographic context, cultural angles
 *
 * Two flows:
 *   1. INITIAL BUILD on onboarding completion — `buildInitialProfile()`
 *   2. ENRICHMENT during ongoing use — `enrichProfile()` (takes existing
 *      profile_md + new context, returns updated profile_md)
 *
 * Both are LLM-backed (MiniMax) and return markdown text. Stored in
 * `users.profile_md`.
 */

import { callMiniMax } from "./minimax";
import { MAX_TOKENS } from "./models";
import { ModelTier } from "@/types/ai";
import type { User } from "@/types/database";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ProfileSourceData {
  /** Structured onboarding fields (always available after onboarding) */
  career_history: User["career_history"];
  education: User["education"];
  goals: User["goals"];
  networking_preferences: User["networking_preferences"];
  /** User's free-text answers from onboarding ("tell me about yourself") */
  about_text?: string;
  /** Optional CV / resume text (parsed from upload, if user provided one) */
  cv_text?: string;
  /** Optional cover letter or past message samples that capture voice */
  voice_samples?: string;
}

// ---------------------------------------------------------------------------
// Initial build — runs once on onboarding completion
// ---------------------------------------------------------------------------

const PROFILE_SYSTEM_PROMPT = `You are building a person's networking-coach profile from their onboarding answers and any optional CV / cover letter / message samples they shared. The profile is markdown that will be read by another AI when drafting outreach messages on this person's behalf.

Capture what's distinctive about this person — not just their resume. Specifically:

1. **Who they are** — name, location, languages, cultural context
2. **Education** — schools (all of them — used for finding shared connections)
3. **Career history** — roles, sectors, key projects, scope
4. **Their transition** — what they're moving FROM and TOWARD, why
5. **Why this person is interesting to talk to** — what they bring to a conversation (expertise, perspective, network access)
6. **Networking hooks per recipient type** — for each likely audience (e.g., VCs, founders, AI people, fellow alumni), what specifically would resonate?
7. **Their voice** — phrases they actually use, tone preferences, things they avoid (gleaned from the voice_samples if provided)

Rules:
- Markdown only. Use H2 headers for the 7 sections above.
- Be specific. "7 years strategy consulting at Monitor Deloitte focused on European pharma pricing and market access" is better than "consulting background."
- Never invent. If a section has no input data, omit it or write "(to be filled in)".
- Keep it under 600 words total. Dense but not exhaustive.
- The output is a working document — it should read like a coach's intake notes, not a polished bio.
- Do NOT include personal sensitive data (date of birth, full address, government IDs) even if provided.`;

export async function buildInitialProfile(
  data: ProfileSourceData
): Promise<string> {
  const userPrompt = `Build the profile markdown from this person's data.

## Career history
${JSON.stringify(data.career_history, null, 2)}

## Education
${JSON.stringify(data.education, null, 2)}

## Goals (for networking)
${JSON.stringify(data.goals, null, 2)}

## Networking preferences
${JSON.stringify(data.networking_preferences, null, 2)}

${data.about_text ? `## About them (their own words)\n${data.about_text}\n` : ""}

${data.cv_text ? `## CV / resume text\n${data.cv_text.slice(0, 6000)}\n` : ""}

${data.voice_samples ? `## Voice samples (past messages they wrote, used to capture tone — DO NOT quote, only extract patterns)\n${data.voice_samples.slice(0, 4000)}\n` : ""}

Return the markdown profile only. No prose around it. No code fences.`;

  const response = await callMiniMax(
    [{ role: "user", content: userPrompt }],
    {
      systemPrompt: PROFILE_SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS[ModelTier.REASONING],
      temperature: 0.4,
    }
  );

  return response.content.trim();
}

// ---------------------------------------------------------------------------
// Enrichment — called when new identity-relevant context surfaces
// ---------------------------------------------------------------------------

const ENRICH_SYSTEM_PROMPT = `You are updating a person's networking-coach profile with new context that surfaced in conversation. Read the existing profile, read the new context, and return a refined version of the profile that integrates anything genuinely new.

Rules:
- Preserve everything in the existing profile that isn't contradicted by the new context.
- Only add or modify sections where the new context provides genuinely new identity-level information (not transient details). If the new context says "I'm in a meeting today" that's not identity-level — skip it. If it says "I just realized I'm specifically interested in healthcare AI, not AI in general" that IS identity-level.
- If the new context contradicts something in the profile, prefer the new context (the user knows themselves better than older inferences).
- Markdown only. Same structure (H2 sections).
- Keep total under 700 words.
- Never invent. If you're unsure whether something is identity-level, leave the existing profile unchanged.

Return ONLY the refined markdown profile. No commentary, no diff, no code fences.`;

export async function enrichProfile(
  existingProfileMd: string,
  newContext: string
): Promise<string> {
  const userPrompt = `## Existing profile
${existingProfileMd}

## New context (from a recent conversation, message, or upload)
${newContext.slice(0, 4000)}

Return the refined profile markdown.`;

  const response = await callMiniMax(
    [{ role: "user", content: userPrompt }],
    {
      systemPrompt: ENRICH_SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS[ModelTier.REASONING],
      temperature: 0.3,
    }
  );

  return response.content.trim();
}

// ---------------------------------------------------------------------------
// Identity-relevance gate — used by the chat route to decide whether to
// fire enrichProfile after a user message. Cheap rule-based check; the LLM
// call is expensive and not worth firing on every message.
// ---------------------------------------------------------------------------

const IDENTITY_KEYWORDS = [
  // Career framing
  "i'm pivoting", "i'm transitioning", "i'm moving from", "i'm moving to",
  "i'm exploring", "i'm interested in", "my background", "my career",
  "my goal is", "i want to focus on", "i want to specialize",
  // Identity disclosure
  "i'm based in", "i grew up", "i studied at", "i went to",
  "my native language", "i speak", "i lived in",
  // Skills/preferences
  "i prefer", "i avoid", "i like to", "i don't like",
  "my style is", "i tend to",
];

/**
 * Returns true if the message looks like it contains identity-level information
 * worth enriching the profile with. Conservative — false negatives are fine
 * (we'll catch it next time); false positives waste an LLM call.
 */
export function looksLikeIdentityDisclosure(message: string): boolean {
  const lower = message.toLowerCase();
  return IDENTITY_KEYWORDS.some((kw) => lower.includes(kw));
}
