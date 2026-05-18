/**
 * POST /api/ai/draft-reply-from-thread
 *
 * Takes a scraped LinkedIn message thread and generates a reply draft
 * IN THE USER'S VOICE — using EVERY voice signal we have, not just
 * the messages in this one thread.
 *
 * Voice signals pulled, ranked by trust:
 *   1. `user_learnings` (approved) — explicit rules the user has
 *      confirmed. These OVERRIDE everything else when they apply.
 *   2. Recent finalized outreach / follow-up artifacts — actual past
 *      messages the user approved or shipped. The gold-standard
 *      sample of their writing in real outreach contexts.
 *   3. `user_memory.writing_style` — auto-learned style from edits
 *      (tone, message length preference, signature phrases, avoids).
 *   4. `profile_md` — narrative identity, transition story, hooks.
 *   5. The user's own messages in THIS thread — strongest contextual
 *      cue for this specific relationship, but limited (the thread
 *      may be empty for a cold reply).
 *
 * Returns { draft, reasoning }. Ephemeral — not persisted. The user
 * pastes/inserts into LinkedIn's compose and edits there.
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
import type { User, Artifact, UserLearning } from "@/types/database";

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
  instruction: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Helpers — build prompt sections from each voice signal
// ---------------------------------------------------------------------------

function buildApprovedLearningsSection(learnings: UserLearning[]): string {
  if (learnings.length === 0) return "";
  const numbered = learnings
    .slice(0, 20)
    .map((l, i) => `${i + 1}. ${l.learning}`)
    .join("\n");
  return `## Approved voice rules (the user has explicitly confirmed these — these OVERRIDE every other signal when they apply)

${numbered}`;
}

function buildPastMessagesSection(artifacts: Artifact[]): string {
  if (artifacts.length === 0) return "";

  const samples = artifacts
    .slice(0, 5)
    .map((a, i) => {
      // Extract the message body from the artifact content. Different
      // artifact types use different keys — try the common ones.
      const c = a.content as Record<string, unknown>;
      const body =
        (typeof c.message === "string" && c.message) ||
        (typeof c.body === "string" && c.body) ||
        (typeof c.draft === "string" && c.draft) ||
        (typeof c.note === "string" && c.note) ||
        "";
      if (!body) return null;
      const trimmed = body.length > 600 ? body.slice(0, 600) + "..." : body;
      return `### Sample ${i + 1} (${a.type}, finalized ${a.updated_at.slice(0, 10)})\n${trimmed}`;
    })
    .filter((s): s is string => s !== null);

  if (samples.length === 0) return "";

  return `## The user's actual past messages (HIGHEST FIDELITY voice samples)

These are real messages the user has finalized in Warmly. They show exactly how this person writes when sending outreach or follow-ups. Match the cadence, sentence length, salutation style, sign-off, and tone of these samples above all else.

${samples.join("\n\n")}`;
}

function buildVoiceMdSection(voiceMd: string | null | undefined): string {
  if (!voiceMd || voiceMd.trim().length === 0) return "";
  return `## Voice profile (the user's actual writing patterns)

This was built from real samples of how the user writes. It overrides the default voice posture and the auto-learned writing_style below when they conflict.

${voiceMd.trim()}`;
}

function buildWritingStyleSection(user: User): string {
  const memory = user.user_memory;
  if (!memory?.writing_style) {
    return `## Default voice posture (no learned style yet)

Casual but professional. Contractions are fine. Direct but warm. Not corporate-stiff. Not over-formatted.`;
  }

  const ws = memory.writing_style;
  const lp = memory.learned_patterns;
  const parts: string[] = ["## Learned writing style (from prior edits in Warmly)"];

  if (ws.tone) parts.push(`**Tone:** ${ws.tone}`);
  if (ws.message_length_preference)
    parts.push(`**Length preference:** ${ws.message_length_preference}`);
  if (ws.preferred_hooks?.length)
    parts.push(`**Hooks they use:** ${ws.preferred_hooks.join(", ")}`);
  if (ws.signature_phrases?.length)
    parts.push(
      `**Signature phrases (weave in when natural):** ${ws.signature_phrases.join(" · ")}`
    );
  if (ws.avoids?.length)
    parts.push(
      `**Vocabulary to NEVER use:** ${ws.avoids.join(" · ")}`
    );
  if (lp?.best_performing_tone)
    parts.push(`**Tone that gets the best response rate:** ${lp.best_performing_tone}`);

  return parts.join("\n");
}

function buildIdentitySection(profileMd: string | null | undefined): string {
  if (!profileMd || profileMd.trim().length === 0) {
    return "## User identity\n\n(Profile not yet built. Rely on the other voice signals.)";
  }
  return `## User identity (background, transition, hooks)

${profileMd.trim()}

Use this to ground specific references — schools, employers, transition story, hooks. Don't re-introduce them in the message itself unless it's the very first contact.`;
}

function buildInThreadVoiceSection(yourMessages: string[]): string {
  if (yourMessages.length === 0) {
    return "## Voice from this thread\n\n(The user hasn't sent any messages in this thread yet — this is a first reply. Lean on the higher-priority voice signals above.)";
  }
  const sample = yourMessages.map((m, i) => `### Message ${i + 1}\n${m}`).join("\n\n");
  return `## Voice from THIS specific thread (use for cadence + relationship-specific tone)

These are messages the user already sent in this conversation. Match the level of formality and warmth they've already established with this person — if they've been casual, keep being casual; if they've been formal, don't suddenly relax.

${sample}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

  // Pull all voice signals in parallel
  const [userResult, learningsResult, artifactsResult] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("user_learnings")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("artifacts")
      .select("*")
      .eq("user_id", user.id)
      .in("type", ["outreach_draft", "follow_up_draft", "connection_note"])
      .in("status", ["finalized", "sent"])
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (!userResult.data) return internalError("User profile not found");
  const userTyped = userResult.data as User;
  const approvedLearnings = (learningsResult.data ?? []) as UserLearning[];
  const pastArtifacts = (artifactsResult.data ?? []) as Artifact[];

  // Format the thread for the LLM
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

  const yourMessages = parsed.data.messages
    .filter((m) => m.sender_role === "user")
    .map((m) => m.text);

  // Build all voice signal sections
  const learningsSection = buildApprovedLearningsSection(approvedLearnings);
  const pastMessagesSection = buildPastMessagesSection(pastArtifacts);
  const voiceMdSection = buildVoiceMdSection(userTyped.voice_md);
  const styleSection = buildWritingStyleSection(userTyped);
  const identitySection = buildIdentitySection(userTyped.profile_md);
  const inThreadSection = buildInThreadVoiceSection(yourMessages);

  // Assemble the system prompt with the strongest voice signals first
  const systemPrompt = `You are drafting a LinkedIn message reply on behalf of a specific person. Your only job: write a reply they would actually send — in their voice, with their natural cadence and tone, serving the conversation thread provided.

# VOICE SIGNAL HIERARCHY

You have multiple voice signals below. When they conflict, this is the priority order:

1. **Approved voice rules** — explicit user-confirmed rules. ALWAYS apply.
2. **Past finalized messages** — real messages they've sent. Match these.
3. **Learned writing style** — auto-extracted patterns from their edits.
4. **In-thread voice** — what they've said to THIS person specifically.
5. **Identity profile** — for grounding facts, not voice.

Match their actual writing patterns from sections 1-4. Section 5 grounds the content but does NOT dictate tone.

---

${learningsSection ? learningsSection + "\n\n---\n\n" : ""}${voiceMdSection ? voiceMdSection + "\n\n---\n\n" : ""}${pastMessagesSection ? pastMessagesSection + "\n\n---\n\n" : ""}${styleSection}

---

${identitySection}

---

${inThreadSection}

---

# UNIVERSAL RULES (apply unless overridden by an approved learning)

- Match the language of the most recent incoming message (English/French/Chinese).
- Keep message length proportional to what they wrote — short in, short reply. Long thoughtful in, more substantive reply.
- Include salutation and sign-off ONLY if their past messages / in-thread voice use them.
- Never invent specific facts (dates, numbers, names, prices) not in the thread or identity profile.
- Never use AI-sounding phrases: "circle back", "leverage", "synergies", "I appreciate", "I hope this finds you well", "delve", "robust", "comprehensive", "crucial", "ultimately".
- No em-dashes (use commas, periods, or ellipses).
- If the latest message in the thread is from THEM and asks a question, address it directly. If the latest is from YOU, the user is probably nudging — write a non-pushy follow-up.

${parsed.data.instruction ? `# USER'S SPECIFIC INSTRUCTION FOR THIS DRAFT\n\n${parsed.data.instruction.trim()}\n\nThis instruction overrides any defaults where they conflict.\n\n` : ""}

# OUTPUT FORMAT

Return ONLY valid JSON, no markdown fence, no prose:

{
  "draft": "the full reply text, ready to paste into LinkedIn",
  "reasoning": "1-2 sentences on which voice signals you anchored to (e.g. 'Matched the short-cadence sign-off from your past follow-ups; addressed Paul's question about the Agent Strategist role.'). Shown to the user as transparency."
}

The "draft" field is the message content ONLY — no preamble, no quotes, no "Here is your draft:".`;

  const userPrompt = `# THE THREAD TO REPLY TO

${threadText}

# TASK

Write the next reply, from YOU (the user) to the other person, applying the voice hierarchy above. Return ONLY the JSON object.`;

  const start = Date.now();
  let result;
  try {
    result = await callMiniMax([{ role: "user", content: userPrompt }], {
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.6,
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

  // Parse the JSON response (lenient — strip markdown fences if any)
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
      voice_signals_used: {
        approved_learnings: approvedLearnings.length,
        past_messages: pastArtifacts.length,
        has_voice_md: !!userTyped.voice_md?.trim(),
        has_writing_style: !!userTyped.user_memory?.writing_style,
        has_profile_md: !!userTyped.profile_md?.trim(),
        in_thread_user_messages: yourMessages.length,
      },
    },
    error: null,
  });
}
