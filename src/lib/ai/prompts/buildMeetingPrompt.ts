/**
 * prompts/buildMeetingPrompt.ts
 *
 * Composes the universal meeting skill content with per-user data
 * (identity narrative, approved learnings, writing style) for the
 * meeting_prep and meeting_notes artifact types.
 *
 * Same per-user composition as buildOutreachPrompt — keeping the
 * personalization layer consistent across artifact families.
 */

import type { GenerationRequest } from "@/types/ai";
import { buildMeetingSystemPrompt } from "@/lib/ai/skills/meeting";

type MeetingFamilyType = "meeting_prep" | "meeting_notes";

function buildIdentitySection(profileMd: string | null | undefined): string {
  if (!profileMd || profileMd.trim().length === 0) return "";
  return `## User identity\n\n${profileMd.trim()}\n\nGround the brief in this person's specific transition story and hooks. The 'positioning_advice' field should be specifically theirs.`;
}

function buildApprovedLearningsSection(
  learnings: string[] | undefined
): string {
  if (!learnings || learnings.length === 0) return "";
  const numbered = learnings
    .slice(0, 30)
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n");
  return `## Approved learnings (apply these — user has explicitly approved)\n\n${numbered}`;
}

function buildStyleSection(
  userMemory: GenerationRequest["context"]["user_memory"]
): string {
  if (!userMemory?.writing_style) return "";
  const ws = userMemory.writing_style;
  const parts: string[] = [`## User's voice (relevant to coaching tone)`];
  if (ws.tone) parts.push(`**Tone:** ${ws.tone}`);
  if (ws.message_length_preference)
    parts.push(`**Length preference:** ${ws.message_length_preference}`);
  if (ws.avoids?.length)
    parts.push(`**Vocabulary they avoid:** ${ws.avoids.join(" · ")}`);
  return parts.join("\n");
}

function buildMeetingUserPrompt(
  artifactType: MeetingFamilyType,
  request: GenerationRequest
): string {
  const { context, user_instructions } = request;
  const u = context.user_profile;
  const c = context.contact_profile;

  const blocks: string[] = [];

  blocks.push(
    `## User (sender)
- Career: ${JSON.stringify(u.career_history)}
- Education: ${JSON.stringify(u.education)}
- Goals: ${JSON.stringify(u.goals)}
- Networking preferences: ${JSON.stringify(u.networking_preferences)}`
  );

  if (c) {
    blocks.push(
      `## Contact (the meeting participant)
- Name: ${c.name}
- Current role: ${c.current_title ?? "—"} at ${c.company ?? "—"}
- Location: ${c.location ?? "—"}
- Career history: ${JSON.stringify(c.career_history)}
- Education: ${JSON.stringify(c.education)}`
    );
  }

  if (context.company_intel_raw) {
    blocks.push(
      `## Company intelligence (recent web search — GROUND company_intel here)
Use this raw search context as the factual basis for company_intel.recent_news and strategic_priorities. Surface only SPECIFIC, datable events (funding rounds with amount/lead/date, leadership moves, launches, pivots) found here — do NOT invent news, and do NOT pad with generic "leading company" boilerplate. For each strategic_priority, add a "→ why it matters" clause tying it to the user's transition goal above. If this context is thin, return fewer items and say so honestly rather than fabricating.

${context.company_intel_raw}`
    );
  } else {
    blocks.push(
      `## Company intelligence
No recent web-search context was available for this company. Do NOT fabricate funding rounds, hires, or news. Keep company_intel.recent_news short or empty, base description only on what's known from the contact's profile, and note the limited signal in the coaching block.`
    );
  }

  if (context.conversation_summary) {
    blocks.push(`## Conversation summary\n${context.conversation_summary}`);
  }

  if (context.recent_messages.length > 0) {
    blocks.push(
      `## Recent messages\n${context.recent_messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`
    );
  }

  blocks.push(
    `## Task
Generate a ${artifactType}.${user_instructions ? `\n\nUser's exact request: "${user_instructions}"` : ""}

Respond with ONLY a valid JSON object matching the schema. No prose around it.`
  );

  return blocks.join("\n\n");
}

export function buildMeetingPrompts(
  artifactType: MeetingFamilyType,
  request: GenerationRequest
): { systemPrompt: string; userPrompt: string } {
  const identity = buildIdentitySection(request.context.user_profile_md);
  const learnings = buildApprovedLearningsSection(
    request.context.approved_learnings
  );
  const style = buildStyleSection(request.context.user_memory);
  const combined = [identity, learnings, style]
    .filter((s) => s.length > 0)
    .join("\n\n");

  return {
    systemPrompt: buildMeetingSystemPrompt(artifactType, combined),
    userPrompt: buildMeetingUserPrompt(artifactType, request),
  };
}

export function isMeetingFamily(type: string): type is MeetingFamilyType {
  return type === "meeting_prep" || type === "meeting_notes";
}
