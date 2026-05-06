/**
 * prompts/buildActionPrompt.ts
 *
 * Composes universal action_plan skill content with per-user data
 * (identity, approved learnings, style) for the action_plan artifact.
 */

import type { GenerationRequest } from "@/types/ai";
import { buildActionSystemPrompt } from "@/lib/ai/skills/action";

function buildIdentitySection(profileMd: string | null | undefined): string {
  if (!profileMd || profileMd.trim().length === 0) return "";
  return `## User identity\n\n${profileMd.trim()}\n\nThe user's transition story should shape what counts as a meaningful next step.`;
}

function buildApprovedLearningsSection(
  learnings: string[] | undefined
): string {
  if (!learnings || learnings.length === 0) return "";
  const numbered = learnings
    .slice(0, 30)
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n");
  return `## Approved learnings (apply when crafting drafts inside actions)\n\n${numbered}`;
}

function buildStyleSection(
  userMemory: GenerationRequest["context"]["user_memory"]
): string {
  if (!userMemory?.writing_style) return "";
  const ws = userMemory.writing_style;
  const parts: string[] = [`## User's voice (for any draft fields in actions)`];
  if (ws.tone) parts.push(`**Tone:** ${ws.tone}`);
  if (ws.avoids?.length)
    parts.push(`**Avoids:** ${ws.avoids.join(" · ")}`);
  if (ws.preferred_hooks?.length)
    parts.push(`**Preferred hooks:** ${ws.preferred_hooks.join(", ")}`);
  return parts.join("\n");
}

function buildActionUserPrompt(request: GenerationRequest): string {
  const { context, user_instructions } = request;
  const u = context.user_profile;
  const c = context.contact_profile;

  const blocks: string[] = [];

  blocks.push(
    `## User (sender)
- Career: ${JSON.stringify(u.career_history)}
- Goals: ${JSON.stringify(u.goals)}`
  );

  if (c) {
    blocks.push(
      `## Contact
- Name: ${c.name}
- Current: ${c.current_title ?? "—"} at ${c.company ?? "—"}
- Location: ${c.location ?? "—"}`
    );
  }

  // Action plans benefit hugely from prior artifacts (especially meeting_notes)
  if (context.artifact_metadata.length > 0) {
    blocks.push(
      `## Prior artifacts for this contact (use to ground next steps in real context)
${context.artifact_metadata.map((a) => `- ${a.type} (${a.status}, created ${a.created_at})`).join("\n")}`
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
Generate an action_plan.${user_instructions ? `\n\nUser's exact request: "${user_instructions}"` : ""}

Be concrete. Pull real names, dates, and references from the context above. If there's nothing meaningful to suggest, return only 1-2 actions and say so honestly in the coaching_note.

Respond with ONLY a valid JSON object matching the schema.`
  );

  return blocks.join("\n\n");
}

export function buildActionPrompts(
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
    systemPrompt: buildActionSystemPrompt(combined),
    userPrompt: buildActionUserPrompt(request),
  };
}

export function isActionFamily(type: string): type is "action_plan" {
  return type === "action_plan";
}
