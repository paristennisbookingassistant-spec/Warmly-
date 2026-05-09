/**
 * ai/coaching.ts
 * Strategic coaching conversation logic.
 * Handles general chat and contact session conversations.
 * Uses Sonnet for coaching; Haiku for factual Q&A.
 */

import type { CoachingRequest, CoachingResponse } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";
import { getModelForConversation, MAX_TOKENS } from "./models";
import { callMiniMax } from "./minimax";
import { stripDashes } from "./sanitizeOutreach";

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
 *
 * Exported so the messages route can detect the trigger BEFORE deciding
 * whether to run a full coaching LLM call. When a trigger fires, we skip
 * coaching entirely and let the artifact generation be the single source
 * of truth — see Session 8 in PROJECT_MEMORY.md for why.
 *
 * Order matters: the more specific patterns are checked first (meeting prep,
 * follow-up, etc.) so that a generic "draft" word doesn't preempt them.
 */
export function detectArtifactTrigger(message: string): ArtifactType | null {
  const lower = message.toLowerCase();

  // Connection note — most specific, check first
  if (
    lower.includes("connection note") ||
    lower.includes("connection request") ||
    /connect\b.*note/.test(lower)
  ) {
    return "connection_note";
  }

  // Meeting prep
  if (
    lower.includes("meeting prep") ||
    lower.includes("prep for") ||
    lower.includes("prepare for") ||
    lower.includes("briefing") ||
    lower.includes("brief me") ||
    /\bprep\b/.test(lower)
  ) {
    return "meeting_prep";
  }

  // Meeting notes — past-tense signals
  if (
    lower.includes("meeting notes") ||
    lower.includes("took notes") ||
    lower.includes("had a call") ||
    lower.includes("just spoke") ||
    lower.includes("just met") ||
    lower.includes("captured what we discussed")
  ) {
    return "meeting_notes";
  }

  // Follow-up
  if (
    lower.includes("follow up") ||
    lower.includes("follow-up") ||
    lower.includes("followup") ||
    lower.includes("thank-you") ||
    lower.includes("thank you note") ||
    lower.includes("after the meeting")
  ) {
    return "follow_up_draft";
  }

  // Action plan
  if (
    lower.includes("action plan") ||
    lower.includes("next steps") ||
    lower.includes("what should i do") ||
    lower.includes("plan for") ||
    lower.includes("game plan") ||
    lower.includes("how do i play this")
  ) {
    return "action_plan";
  }

  // Outreach — broadest, check last. In a contact session, generic verbs like
  // "draft", "write", "message" almost always mean an outreach draft.
  if (
    lower.includes("outreach") ||
    lower.includes("message to") ||
    lower.includes("draft a message") ||
    lower.includes("draft an") ||
    lower.includes("draft me") ||
    lower.includes("write a message") ||
    lower.includes("write me") ||
    lower.includes("write him") ||
    lower.includes("write her") ||
    lower.includes("write them") ||
    lower.includes("compose") ||
    lower.includes("intro message") ||
    lower.includes("introduction") ||
    lower.includes("first message") ||
    lower.includes("reach out") ||
    lower.includes("send him") ||
    lower.includes("send her") ||
    lower.includes("send them") ||
    /^draft\b/.test(lower) ||
    /\bdraft\b.*\b(message|email|note|intro)\b/.test(lower)
  ) {
    return "outreach_draft";
  }

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

  const response = await callMiniMax(
    [{ role: "user", content: userPrompt }],
    { systemPrompt, maxTokens: MAX_TOKENS[model] }
  );

  // Strip em/en-dashes from the coaching reply too. The system prompt asks
  // the model not to use them; the artifact pipeline guarantees it via the
  // sanitizer. This makes coaching consistent — the user shouldn't see
  // em-dashes in chat just because the message went through the coaching
  // path instead of the artifact path.
  const { text: agentMessage } = stripDashes(response.content);

  return {
    agent_message: agentMessage,
    trigger_artifact: triggerArtifact ?? undefined,
    model_used: model,
    tokens_input: response.usage?.prompt_tokens ?? 0,
    tokens_output: response.usage?.completion_tokens ?? 0,
  };
}

function buildCoachingSystemPrompt(request: CoachingRequest): string {
  const { user_memory, user_profile_md } = request.context;

  const memorySection = user_memory?.learned_patterns.successful_hooks.length
    ? `\n\nUser history: Their most successful outreach hooks are ${user_memory.learned_patterns.successful_hooks.map((h) => `${h.hook_type} (${Math.round(h.success_rate * 100)}% success)`).join(", ")}.`
    : "";

  // Inject the persistent identity narrative directly in the system prompt so
  // the coach treats it as load-bearing context, not optional flavor. This is
  // the single most important hedge against the coach asking "who are you?"
  // when we already know.
  const identitySection = user_profile_md
    ? `\n\n--- WHO THE USER IS (read this before asking anything about them) ---\n${user_profile_md}\n--- end identity ---`
    : "";

  return `You are an expert AI networking coach. You guide professionals through the full networking lifecycle: discovering contacts, crafting outreach, preparing for meetings, and maintaining relationships.

Your communication style: warm, direct, actionable. Never generic — always reference the user's specific context.
Be concise but thorough. Use bullet points for action items.${memorySection}${identitySection}

If the user asks you to generate an artifact (draft a message, prep for a meeting, follow-up, action plan, etc.), DO NOT write the artifact content inline in your reply. Acknowledge briefly that you'll prepare it ("Drafting that for you now…") and stop — the system handles generation separately and shows the artifact as an editable card. Writing the artifact inline produces a duplicate that diverges from the canonical version.

Never ask the user to introduce themselves or describe their background if any of these are populated: their identity narrative above, the structured profile, or recent messages in this conversation. Use what you have.`;
}

function buildCoachingUserPrompt(request: CoachingRequest): string {
  const { context, user_message } = request;
  const parts: string[] = [];

  // Structured profile — only include if it has actual content. An empty
  // object adds no signal and tempts the LLM to ask the user to fill it in.
  if (context.user_profile) {
    const hasContent =
      (context.user_profile.career_history?.length ?? 0) > 0 ||
      (context.user_profile.education?.length ?? 0) > 0 ||
      Object.keys(context.user_profile.goals ?? {}).length > 0;
    if (hasContent) {
      parts.push(`Structured profile: ${JSON.stringify(context.user_profile)}`);
    }
  }
  if (context.contact_profile) {
    parts.push(`Contact you're discussing: ${JSON.stringify(context.contact_profile)}`);
  }
  if (context.conversation_summary) {
    parts.push(`Conversation history summary: ${context.conversation_summary}`);
  }
  if (context.recent_messages.length > 0) {
    parts.push(
      `Recent messages in this thread:\n${context.recent_messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`
    );
  }

  parts.push(`User: ${user_message}`);
  return parts.join("\n\n");
}
