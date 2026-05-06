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
import {
  buildOutreachPrompts,
  isOutreachFamily,
} from "@/lib/ai/prompts/buildOutreachPrompt";

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

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Generation model returned non-JSON response: ${text}`);
  }

  const content = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  return {
    content,
    model_used: model,
    tokens_input: response.usage?.prompt_tokens ?? 0,
    tokens_output: response.usage?.completion_tokens ?? 0,
  };
}

/**
 * Top-level prompt router. Picks the right builder per artifact family.
 */
function buildPrompts(request: GenerationRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  // Outreach-family artifacts use the rich Warmly outreach skill
  if (isOutreachFamily(request.artifact_type)) {
    return buildOutreachPrompts(request.artifact_type, request);
  }

  // All other artifact types fall through to the generic prompt
  // (TODO Phase D: split meeting_prep/meeting_notes and action_plan
  // into their own skill files for parity with outreach.)
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
