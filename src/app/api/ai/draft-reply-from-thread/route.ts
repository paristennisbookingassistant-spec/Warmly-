/**
 * POST /api/ai/draft-reply-from-thread
 *
 * Takes a scraped LinkedIn message thread + the authenticated user's
 * profile_md and generates a reply draft IN THE USER'S VOICE.
 *
 * The "voice" signal is two-fold:
 *   1. profile_md captures the user's narrative identity + hooks
 *   2. The user's prior messages WITHIN THIS THREAD are the strongest
 *      voice sample we have — they're talking to this exact person in
 *      this exact context. The LLM mimics the cadence, salutation
 *      style, sign-off, and tone from those.
 *
 * Returns:
 *   - draft: the suggested reply text
 *   - reasoning: 1-2 lines on why this approach (shown to user as
 *     transparency, also useful when they hit Regenerate)
 *
 * NOT persisted. This is an ephemeral draft — the user copies it into
 * LinkedIn's compose box and edits/sends from there. We don't store
 * the thread or the draft anywhere.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { callMiniMax } from "@/lib/ai/minimax";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type { User } from "@/types/database";

const MessageSchema = z.object({
  sender_role: z.enum(["user", "them", "unknown"]),
  sender_name: z.string().nullable().optional(),
  text: z.string().min(1).max(8000),
  timestamp_raw: z.string().nullable().optional(),
});

const InputSchema = z.object({
  participant_name: z.string().nullable().optional(),
  participant_linkedin_url: z.string().nullable().optional(),
  messages: z
    .array(MessageSchema)
    .min(1, "At least one message is required")
    .max(200, "Thread too long — cap at 200 messages"),
  /**
   * Optional steer from the user — e.g. "make it shorter" or
   * "ask about their Series A timeline". Empty on first draft, set
   * by Regenerate-with-instruction flow.
   */
  instruction: z.string().max(500).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Load user (with profile_md for voice + identity grounding)
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!userData) return internalError("User profile not found");
  const userTyped = userData as User;

  // Format the thread for the LLM. Use sender role markers, drop
  // redundant timestamps to save tokens.
  const threadText = parsed.data.messages
    .map((m) => {
      const role =
        m.sender_role === "user"
          ? `YOU${m.sender_name ? ` (${m.sender_name})` : ""}`
          : m.sender_role === "them"
          ? `THEM${m.sender_name ? ` (${m.sender_name})` : ""}`
          : m.sender_name || "Unknown sender";
      return `${role}:\n${m.text}`;
    })
    .join("\n\n---\n\n");

  // Pull just the user's own messages — strongest voice sample
  const yourMessages = parsed.data.messages
    .filter((m) => m.sender_role === "user")
    .map((m) => m.text)
    .join("\n\n---\n\n");

  const systemPrompt = `You are drafting a LinkedIn message reply on behalf of a specific person. Your only job: write a reply they would actually send — in their voice, with their natural cadence, and serving the conversation thread provided.

## Voice signal — read this carefully

The user's own prior messages in this thread are the GOLD STANDARD for voice. Match:
- Their salutation style (e.g. "Hi [name]," vs "Hey [name]" vs just first-name)
- Their typical message length and paragraph cadence
- Their sign-off (e.g. "Cheers," "Best," "Liyang" alone)
- Their tone — warmth vs formality, directness, use of contractions
- Specific phrases or rhythms they repeat

If they write short messages, you write short. If they sign off with "Cheers,\\n[Name]", you do the same. Do NOT add corporate filler ("I hope this finds you well") or AI-sounding phrases ("circle back", "leverage", "synergies", "I appreciate").

## The user's identity (use to ground references, not to introduce themselves again)

${userTyped.profile_md?.trim() || "(No profile loaded — rely on the thread alone.)"}

## Output format

Return ONLY valid JSON, no markdown fence:

{
  "draft": "the full reply text, ready to paste into LinkedIn",
  "reasoning": "1-2 sentences explaining the approach you took (this is shown to the user for transparency, NOT included in the message)"
}

Rules:
- The "draft" field is the message content ONLY. No "Here is your draft:" preamble.
- Include the salutation and sign-off if the user's prior messages use them.
- Match the language of the most recent message in the thread (English/French/Chinese).
- Keep it natural-length: a 2-line incoming message gets a 2-4 line reply, not an essay.
- Never invent specific facts (dates, numbers, names) that aren't in the thread or profile.
- If the latest message is from THEM and asks a question, address it. If the latest is from YOU, the user is probably trying to nudge — draft a follow-up that doesn't feel pushy.
${
  parsed.data.instruction
    ? `\n## User's specific instruction for THIS draft\n\n${parsed.data.instruction.trim()}\n\nThis instruction overrides defaults where they conflict.`
    : ""
}`;

  const userPrompt = `## The conversation thread

${threadText}

## The user's own messages extracted (voice reference)

${yourMessages || "(The user hasn't sent any messages in this thread yet — this is the first reply. Use profile_md voice signal.)"}

## Now draft the reply

The reply is from the user (the "YOU" speaker) to the other person. Write what they should send next.`;

  const start = Date.now();
  let result;
  try {
    result = await callMiniMax([{ role: "user", content: userPrompt }], {
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.65,
    });
  } catch (err) {
    console.error("Draft-reply LLM call failed:", err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return internalError(`Draft generation failed: ${reason}`);
  }

  logAiCall({
    route: "POST /api/ai/draft-reply-from-thread",
    model: "MiniMax-M2.7-highspeed",
    tokensInput: result.usage?.prompt_tokens ?? 0,
    tokensOutput: result.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
  });

  // Parse the JSON response. Be lenient — strip markdown fences if the
  // LLM ignored the no-fence rule.
  const rawContent = result.content.trim();
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsedResponse: { draft: string; reasoning: string };
  try {
    parsedResponse = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse LLM response as JSON:", cleaned);
    return internalError(
      "Draft generation returned malformed output — please try again"
    );
  }

  if (
    typeof parsedResponse.draft !== "string" ||
    parsedResponse.draft.trim().length === 0
  ) {
    return internalError("Draft generation returned an empty draft");
  }

  return NextResponse.json({
    data: {
      draft: parsedResponse.draft.trim(),
      reasoning: parsedResponse.reasoning?.trim() || "",
      participant_name: parsed.data.participant_name,
      message_count: parsed.data.messages.length,
    },
    error: null,
  });
}
