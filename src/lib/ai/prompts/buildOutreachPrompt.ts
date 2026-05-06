/**
 * prompts/buildOutreachPrompt.ts
 *
 * Composes the universal outreach skill content (from src/lib/ai/skills/outreach.ts)
 * with per-user data (career history, education, goals, learned writing style)
 * to produce the system + user prompts for the three outreach-family artifacts:
 * connection_note, outreach_draft, follow_up_draft.
 *
 * The skill content is the WHAT (philosophy, voice rules, templates, schemas).
 * The per-user data is the WHO (this specific user's background and voice).
 *
 * Future per-user inputs to add (Phase B + C):
 *   - users.profile_md — auto-built identity narrative from onboarding/CV
 *   - user_learnings  — approved learnings extracted from sent messages
 */

import type { GenerationRequest } from "@/types/ai";
import { buildOutreachSystemPrompt } from "@/lib/ai/skills/outreach";

type OutreachFamilyType =
  | "connection_note"
  | "outreach_draft"
  | "follow_up_draft";

/**
 * Build the per-user "writing style" block that gets injected into the system
 * prompt. Reads from user_memory.writing_style which is auto-populated by
 * extractStylePreferences on every artifact edit (PRD 5.9 Layer 1).
 *
 * Returns a section with appropriate framing OR empty string if no learning yet.
 */
function buildPerUserStyleSection(
  userMemory: GenerationRequest["context"]["user_memory"]
): string {
  if (!userMemory?.writing_style) {
    // No learned style yet. Return a minimal default voice anchor.
    return `## Default voice (until user style is learned from edits)

Casual but professional. Uses contractions naturally. Direct but warm. Not corporate. Not stiff. Not over-formatted.`;
  }

  const ws = userMemory.writing_style;
  const lp = userMemory.learned_patterns;

  const parts: string[] = [`## User's voice (learned from their actual edits)`];

  if (ws.tone) {
    parts.push(`**Tone:** ${ws.tone}`);
  }
  if (ws.message_length_preference) {
    parts.push(`**Length preference:** ${ws.message_length_preference}`);
  }
  if (ws.preferred_hooks?.length) {
    parts.push(`**Hooks they use:** ${ws.preferred_hooks.join(", ")}`);
  }
  if (ws.signature_phrases?.length) {
    parts.push(
      `**Signature phrases (use these naturally when relevant):** ${ws.signature_phrases.join(" · ")}`
    );
  }
  if (ws.avoids?.length) {
    parts.push(
      `**Vocabulary they avoid (NEVER use these):** ${ws.avoids.join(" · ")}`
    );
  }
  if (lp?.successful_hooks?.length) {
    const top = lp.successful_hooks
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 3);
    parts.push(
      `**Hooks with proven success:** ${top.map((h) => `${h.hook_type} (${Math.round(h.success_rate * 100)}%)`).join(" · ")}`
    );
  }
  if (lp?.best_performing_tone) {
    parts.push(`**Tone that gets best response rates:** ${lp.best_performing_tone}`);
  }

  return parts.join("\n");
}

/**
 * Build the user prompt body containing all the per-call context: who the
 * sender is (structured profile), who the recipient is (contact data),
 * conversation continuity (summary + recent messages), and the user's
 * specific request (e.g., "draft a message to Dominik").
 */
function buildOutreachUserPrompt(
  artifactType: OutreachFamilyType,
  request: GenerationRequest
): string {
  const { context, user_instructions } = request;
  const u = context.user_profile;
  const c = context.contact_profile;

  const blocks: string[] = [];

  // Sender identity (from structured DB columns)
  blocks.push(
    `## Sender (you are drafting on behalf of this person)
- Career: ${JSON.stringify(u.career_history)}
- Education: ${JSON.stringify(u.education)}
- Goals: ${JSON.stringify(u.goals)}
- Networking preferences: ${JSON.stringify(u.networking_preferences)}`
  );

  // Recipient identity
  if (c) {
    blocks.push(
      `## Recipient
- Name: ${c.name}
- Current role: ${c.current_title ?? "—"} at ${c.company ?? "—"}
- Location: ${c.location ?? "—"}
- Career history: ${JSON.stringify(c.career_history)}
- Education: ${JSON.stringify(c.education)}`
    );
  }

  // Conversation continuity
  if (context.conversation_summary) {
    blocks.push(
      `## Conversation summary (prior context with the agent)\n${context.conversation_summary}`
    );
  }
  if (context.recent_messages.length > 0) {
    blocks.push(
      `## Recent messages\n${context.recent_messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}`
    );
  }

  // The user's actual instruction
  blocks.push(
    `## Task
Generate a ${artifactType}.${user_instructions ? `\n\nUser's exact request: "${user_instructions}"` : ""}

Run the hard gates one final time before responding. If the draft contains an em-dash, a forbidden phrase, or a vocabulary item from the avoid list, rewrite. The output must pass every gate.

Respond with ONLY a valid JSON object matching the schema. No prose around it.`
  );

  return blocks.join("\n\n");
}

/**
 * Public API — used by `lib/ai/generation.ts` to build prompts for
 * outreach-family artifact types.
 */
export function buildOutreachPrompts(
  artifactType: OutreachFamilyType,
  request: GenerationRequest
): { systemPrompt: string; userPrompt: string } {
  const styleSection = buildPerUserStyleSection(request.context.user_memory);
  const systemPrompt = buildOutreachSystemPrompt(artifactType, styleSection);
  const userPrompt = buildOutreachUserPrompt(artifactType, request);
  return { systemPrompt, userPrompt };
}

/**
 * Type guard — is this artifact type in the outreach family?
 */
export function isOutreachFamily(type: string): type is OutreachFamilyType {
  return (
    type === "connection_note" ||
    type === "outreach_draft" ||
    type === "follow_up_draft"
  );
}
