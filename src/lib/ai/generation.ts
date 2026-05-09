/**
 * ai/generation.ts
 *
 * Routes artifact generation to the right prompt builder based on artifact
 * type. Outreach-family artifacts (connection_note, outreach_draft,
 * follow_up_draft) get the rich Warmly outreach skill prompt with
 * philosophy + voice rules + anti-AI gates + templates. Other artifact types
 * (meeting_prep, meeting_notes, action_plan) currently use the generic
 * prompt — Phase D will give them their own skill files.
 */

import type { ArtifactType } from "@/types/artifacts";
import type { GenerationRequest, GenerationResponse } from "@/types/ai";
import { getModelForArtifact, MAX_TOKENS } from "./models";
import { callMiniMax } from "./minimax";
import { sanitizeOutreachContent } from "./sanitizeOutreach";
import {
  buildOutreachPrompts,
  isOutreachFamily,
} from "@/lib/ai/prompts/buildOutreachPrompt";
import {
  buildMeetingPrompts,
  isMeetingFamily,
} from "@/lib/ai/prompts/buildMeetingPrompt";
import {
  buildActionPrompts,
  isActionFamily,
} from "@/lib/ai/prompts/buildActionPrompt";

/**
 * Generates an artifact for a given contact/conversation context.
 * Routes to the correct prompt builder based on artifact type.
 */
export async function generateArtifact(
  request: GenerationRequest
): Promise<GenerationResponse> {
  const model = getModelForArtifact(
    request.artifact_type,
    request.force_reasoning_model
  );

  const { systemPrompt, userPrompt } = buildPrompts(request);

  const response = await callMiniMax(
    [{ role: "user", content: userPrompt }],
    { systemPrompt, maxTokens: MAX_TOKENS[model] }
  );

  const text = response.content;

  // Strip code fences if the model wrapped the JSON in ```json ... ```
  const fencedMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fencedMatch ? fencedMatch[1] : text;
  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(
      `[generate ${request.artifact_type}] Non-JSON response from model. First 500 chars:`,
      text.slice(0, 500)
    );
    throw new Error(`Generation model returned non-JSON response`);
  }

  let rawContent: Record<string, unknown>;
  try {
    rawContent = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch (err) {
    console.error(
      `[generate ${request.artifact_type}] JSON parse failed. Raw match:`,
      jsonMatch[0].slice(0, 500)
    );
    throw new Error(
      `Generation model returned malformed JSON: ${err instanceof Error ? err.message : "unknown"}`
    );
  }

  // Some models occasionally return the artifact under alternate keys
  // (note, body, text, draft) instead of message. Normalize before
  // sanitization so the rest of the pipeline doesn't see an empty field.
  if (typeof rawContent.message !== "string" || rawContent.message.trim().length === 0) {
    const fallbackKeys = ["note", "body", "text", "draft", "content"] as const;
    for (const k of fallbackKeys) {
      const v = rawContent[k];
      if (typeof v === "string" && v.trim().length > 0) {
        console.warn(
          `[generate ${request.artifact_type}] message empty/missing, hoisted from "${k}"`
        );
        rawContent.message = v;
        delete rawContent[k];
        break;
      }
    }
  }

  // Defense-in-depth: deterministic post-processing for outreach-family
  // artifacts. Strips em-dashes and enforces the 300-char limit on
  // connection_note. The system prompt asks the model to do this; the
  // sanitizer guarantees it. See sanitizeOutreach.ts for the full rationale.
  const { content, warnings } = sanitizeOutreachContent(
    request.artifact_type,
    rawContent
  );
  if (warnings.length > 0) {
    console.log(
      `[outreach sanitize] ${request.artifact_type}: ${warnings.join("; ")}`
    );
  }

  // Final guard: outreach-family artifacts MUST have a non-empty message.
  // Saving an empty card is worse than failing — the user would see a blank
  // artifact and lose trust. Throwing here lets the route fall through to
  // the deterministic "I tried to draft something but it failed" fallback,
  // which prompts the user to retry.
  if (
    (request.artifact_type === "connection_note" ||
      request.artifact_type === "outreach_draft" ||
      request.artifact_type === "follow_up_draft") &&
    (typeof content.message !== "string" || content.message.trim().length === 0)
  ) {
    console.error(
      `[generate ${request.artifact_type}] Empty message after sanitize. Raw content keys:`,
      Object.keys(rawContent).join(", "),
      "First 300 chars of raw:",
      JSON.stringify(rawContent).slice(0, 300)
    );
    throw new Error(
      `Generation produced empty ${request.artifact_type} message`
    );
  }

  return {
    content,
    model_used: model,
    tokens_input: response.usage?.prompt_tokens ?? 0,
    tokens_output: response.usage?.completion_tokens ?? 0,
  };
}

/**
 * Top-level prompt router. Picks the right builder per artifact family.
 *
 * Each family has its own skill file (`src/lib/ai/skills/<family>.ts`)
 * carrying universal philosophy + structure, plus a per-family prompt
 * builder (`src/lib/ai/prompts/build<Family>Prompt.ts`) that composes
 * universal content with per-user data (profile_md + approved learnings
 * + writing style).
 */
function buildPrompts(request: GenerationRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  if (isOutreachFamily(request.artifact_type)) {
    return buildOutreachPrompts(request.artifact_type, request);
  }
  if (isMeetingFamily(request.artifact_type)) {
    return buildMeetingPrompts(request.artifact_type, request);
  }
  if (isActionFamily(request.artifact_type)) {
    return buildActionPrompts(request);
  }
  // Fallback for any future artifact type without a dedicated skill yet
  return buildGenericPrompts(request);
}

/**
 * Generic prompt builder used for meeting_prep, meeting_notes, action_plan.
 * Identical to what shipped before this refactor — preserved verbatim so
 * those artifact types remain unchanged while we ship the outreach skill.
 */
function buildGenericPrompts(request: GenerationRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { artifact_type, context, user_instructions } = request;

  const systemPrompt = buildGenericSystemPrompt(artifact_type, context.user_memory);

  const userPrompt = `## User Profile
${JSON.stringify(context.user_profile, null, 2)}

## Contact Profile
${JSON.stringify(context.contact_profile, null, 2)}

${context.conversation_summary ? `## Conversation Summary\n${context.conversation_summary}\n` : ""}

${context.recent_messages.length > 0 ? `## Recent Messages\n${context.recent_messages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n` : ""}

${context.company_intel_raw ? `## Company Intelligence (recent web search)\n${context.company_intel_raw}\n` : ""}

## Task
Generate a ${artifact_type} artifact.${user_instructions ? `\n\nUser instructions: ${user_instructions}` : ""}

Respond with ONLY a valid JSON object matching the ${artifact_type} content structure.`;

  return { systemPrompt, userPrompt };
}

function buildGenericSystemPrompt(
  artifactType: ArtifactType,
  userMemory: GenerationRequest["context"]["user_memory"]
): string {
  const styleInstructions = userMemory?.writing_style
    ? `\n\n## User Writing Style (adapt to this)
Tone: ${userMemory.writing_style.tone}
Avoids: ${userMemory.writing_style.avoids.join(", ") || "nothing specific"}
Preferred hooks: ${userMemory.writing_style.preferred_hooks.join(", ") || "not yet learned"}
Message length: ${userMemory.writing_style.message_length_preference}`
    : "";

  const schemas: Record<ArtifactType, string> = {
    connection_note: `{ "message": string, "hook": string, "char_count": number }
NOTE: message MUST be 300 characters or fewer (LinkedIn limit).`,
    outreach_draft: `{ "message": string, "tone": "professional"|"warm"|"casual", "hook": string, "channel": "linkedin_message"|"email", "char_count": number, "subject"?: string }`,
    meeting_prep: `{ "person_summary": string, "company_intel": { "description": string, "recent_news": [{"headline": string, "date"?: string}], "strategic_priorities": string[] }, "discussion_themes": [{"name": string, "questions": string[]}], "coaching": { "do_list": string[], "dont_list": string[], "positioning_advice": string, "recommended_ask": "advice"|"referral"|"introduction"|"none yet" } }`,
    meeting_notes: `{ "key_takeaways": string[], "next_steps": [{"description": string, "timing": string, "completed": false}], "user_raw_notes": string }`,
    action_plan: `{ "actions": [{"description": string, "timing": string, "priority": "high"|"medium"|"low", "completed": false, "draft"?: string}], "coaching_note": string }`,
    follow_up_draft: `{ "message": string, "reference_to_meeting": string, "timing_suggestion": string, "channel": "linkedin_message"|"email", "tone": "professional"|"warm"|"casual" }`,
  };

  return `You are an expert professional networking coach generating a ${artifactType} artifact.

Rules:
- Return ONLY valid JSON matching the schema below
- Never hallucinate details not present in the profiles
- Be specific — reference actual career history, companies, schools
- Be authentic — do not use generic templates${styleInstructions}

## Required JSON Schema
${schemas[artifactType]}`;
}
