/**
 * ai/coaching.ts
 * Strategic coaching conversation logic.
 * Handles general chat and contact session conversations.
 * Uses Sonnet for coaching; Haiku for factual Q&A.
 */

import type { CoachingRequest, CoachingResponse } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";
import { anthropic, getModelForConversation, MAX_TOKENS } from "./models";

/**
 * Determines whether a user message requires strategic coaching (Sonnet)
 * or can be answered with factual responses (Haiku).
 */
function isStrategicCoachingRequest(message: string): boolean {
  const strategicKeywords = [
    "strategy", "approach", "advice", "recommend", "should i", "how do i",
    "prepare", "negotiate", "career", "position", "networking", "outreach plan",
  ];
  const lower = message.toLowerCase();
  return strategicKeywords.some((kw) => lower.includes(kw));
}

/**
 * Detects whether the agent should trigger artifact generation based on
 * the user's message. Returns the artifact type to generate, or null.
 */
function detectArtifactTrigger(message: string): ArtifactType | null {
  const lower = message.toLowerCase();
  if (lower.includes("connection note") || lower.includes("connection request")) return "connection_note";
  if (lower.includes("outreach") || lower.includes("message to") || lower.includes("draft a message")) return "outreach_draft";
  if (lower.includes("meeting prep") || lower.includes("prepare for") || lower.includes("briefing")) return "meeting_prep";
  if (lower.includes("meeting notes") || lower.includes("took notes") || lower.includes("had a call")) return "meeting_notes";
  if (lower.includes("action plan") || lower.includes("next steps") || lower.includes("what should i do")) return "action_plan";
  if (lower.includes("follow up") || lower.includes("follow-up")) return "follow_up_draft";
  return null;
}

/**
 * Processes a user message in a coaching conversation.
 * Routes to the correct model tier and detects artifact triggers.
 */
export async function processCoachingMessage(
  request: CoachingRequest
): Promise<CoachingResponse> {
  const isStrategic = isStrategicCoachingRequest(request.user_message);
  const model = getModelForConversation(isStrategic);
  const triggerArtifact = detectArtifactTrigger(request.user_message);

  const systemPrompt = buildCoachingSystemPrompt(request);
  const userPrompt = buildCoachingUserPrompt(request);

  const response = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS[model],
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const agentMessage =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    agent_message: agentMessage,
    trigger_artifact: triggerArtifact ?? undefined,
    model_used: model,
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
  };
}

function buildCoachingSystemPrompt(request: CoachingRequest): string {
  const { user_memory } = request.context;

  const memorySection = user_memory?.learned_patterns.successful_hooks.length
    ? `\n\nUser history: Their most successful outreach hooks are ${user_memory.learned_patterns.successful_hooks.map((h) => `${h.hook_type} (${Math.round(h.success_rate * 100)}% success)`).join(", ")}.`
    : "";

  return `You are an expert AI networking coach. You guide professionals through the full networking lifecycle: discovering contacts, crafting outreach, preparing for meetings, and maintaining relationships.

Your communication style: warm, direct, actionable. Never generic — always reference the user's specific context.
Be concise but thorough. Use bullet points for action items.${memorySection}

If the user asks you to generate an artifact (draft a message, prep for a meeting, etc.), acknowledge you'll do it and describe what you'll create — the system will handle generation separately.`;
}

function buildCoachingUserPrompt(request: CoachingRequest): string {
  const { context, user_message } = request;
  const parts: string[] = [];

  if (context.user_profile) {
    parts.push(`User profile: ${JSON.stringify(context.user_profile)}`);
  }
  if (context.contact_profile) {
    parts.push(`Contact: ${JSON.stringify(context.contact_profile)}`);
  }
  if (context.conversation_summary) {
    parts.push(`Conversation history summary: ${context.conversation_summary}`);
  }
  if (context.recent_messages.length > 0) {
    parts.push(
      `Recent messages:\n${context.recent_messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`
    );
  }

  parts.push(`User: ${user_message}`);
  return parts.join("\n\n");
}
