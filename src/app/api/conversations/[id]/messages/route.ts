/**
 * GET  /api/conversations/[id]/messages  — Paginated message history
 * POST /api/conversations/[id]/messages  — Main chat endpoint
 *
 * POST flow:
 *  1. Authenticate + verify conversation ownership
 *  2. Save user message to DB
 *  3. Load context (contact profile, summary, recent messages)
 *  4. Check if rolling summarization is needed (>= 15 messages)
 *  5. Call processCoachingMessage() (Haiku or Sonnet based on content)
 *  6. If artifact trigger detected → call generateArtifact() and save
 *  7. Save agent message with artifact_ids
 *  8. Update conversation.updated_at
 *  9. Return both messages + created artifacts
 */

import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { processCoachingMessage, detectArtifactTrigger } from "@/lib/ai/coaching";
import { generateArtifact } from "@/lib/ai/generation";
import { summarizeConversation, SUMMARIZATION_THRESHOLD } from "@/lib/ai/context";
import {
  buildInitialProfile,
  enrichProfile,
  looksLikeIdentityDisclosure,
} from "@/lib/ai/profile";
import { searchCompanyIntel } from "@/lib/search";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  rateLimitError,
  buildPaginatedResponse,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type {
  ListMessagesResponse,
  SendMessageResponse,
} from "@/types/api";
import type {
  ConversationMessage,
  Artifact,
  Conversation,
  Contact,
  User,
} from "@/types/database";
import type { ArtifactType } from "@/types/artifacts";
import type { ConversationSummary } from "@/types/ai";

// ---------------------------------------------------------------------------
// Constants — deterministic reply when artifact is triggered
// ---------------------------------------------------------------------------

/**
 * When a user message triggers artifact generation in a contact session,
 * we SKIP the coaching LLM call and use this deterministic short reply
 * instead. Prevents the artifact body and the chat reply from diverging
 * (the bug Session 8 in PROJECT_MEMORY.md captured).
 *
 * The reply also signals intent ("opening it now") so the user knows the
 * card below the message is the canonical, editable version.
 */
const ARTIFACT_INTRO: Record<ArtifactType, (name: string) => string> = {
  connection_note: (name) =>
    `Drafted a connection note for ${name} — opening it now. Review, edit if it doesn't sound like you, then send.`,
  outreach_draft: (name) =>
    `Drafted your outreach to ${name} — opening it now. Tweak anything that feels off, then mark it as sent when you've actually sent it.`,
  meeting_prep: (name) =>
    `Prepared the briefing for your meeting with ${name} — opening it now. Skim the discussion topics and questions before you walk in.`,
  meeting_notes: (name) =>
    `Captured your notes from the conversation with ${name} — opening it now. Add anything I missed before finalizing.`,
  action_plan: (name) =>
    `Mapped out the next steps with ${name} — opening it now. Adjust the timing if anything's unrealistic.`,
  follow_up_draft: (name) =>
    `Drafted your follow-up to ${name} — opening it now. Make it sound like you, then mark as sent.`,
};

const ARTIFACT_FALLBACK_FAILURE = (name: string) =>
  `I tried to draft something for ${name} but the generation failed — try again in a moment.`;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
  after_id: z.string().uuid().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Verify conversation ownership
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) return notFound("Conversation");

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListMessagesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { page, per_page, after_id } = parsed.data;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabase
    .from("conversation_messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (after_id) {
    // Cursor-based: get messages after the given message's created_at
    const { data: cursorMsg } = await supabase
      .from("conversation_messages")
      .select("created_at")
      .eq("id", after_id)
      .single();
    if (cursorMsg) {
      query = query.gt("created_at", cursorMsg.created_at);
    }
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("messages GET error:", error);
    return internalError("Failed to fetch messages");
  }

  const response: ListMessagesResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as ConversationMessage[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// POST handler — main chat endpoint
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // 1. Load conversation + verify ownership
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) return notFound("Conversation");

  const conv = conversation as Conversation;

  // 2. Rate limit — max 10 user messages per minute across all conversations
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { data: userConvIds } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id);
  const convIds = (userConvIds ?? []).map((c) => c.id as string);
  const { count: recentCount } = await supabase
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds.length > 0 ? convIds : [""])
    .eq("role", "user")
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= 10) {
    return rateLimitError("Too many requests — please wait before sending another message");
  }

  // 3. Load user profile
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) return internalError("User profile not found");
  const userTyped = userData as User;

  // 3. Load contact if contact_session
  let contact: Contact | null = null;
  if (conv.contact_id) {
    const { data: contactData } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", conv.contact_id)
      .eq("user_id", user.id)
      .single();
    contact = (contactData as Contact) ?? null;
  }

  // 4. Load recent messages for context
  const { data: recentMessagesData, count: totalMessageCount } = await supabase
    .from("conversation_messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const recentMessages = ((recentMessagesData ?? []) as ConversationMessage[]).reverse();
  const messageCount = totalMessageCount ?? 0;

  // Cross-thread memory used to be loaded here as a band-aid when profile_md
  // wasn't populated. Now that profile_md is auto-built and enriched, it is
  // the canonical identity source — contact sessions stay scoped to their
  // own conversation so general-thread chatter doesn't bleed into them.

  // 5. Save user message to DB
  const { data: savedUserMessage, error: userMsgError } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.data.content,
      artifacts_generated: [],
    })
    .select()
    .single();

  if (userMsgError || !savedUserMessage) {
    console.error("Failed to save user message:", userMsgError);
    return internalError("Failed to save message");
  }

  // 5b. Schedule profile_md bootstrap or enrichment (async via after()).
  // This is the wiring that makes the coach actually remember who you are.
  // Two paths:
  //   - Bootstrap: profile_md is empty → build it from chat history once
  //   - Enrich: profile_md exists + this message looks identity-revealing →
  //              merge the new context into the existing markdown
  // Both run AFTER the response is sent so they never add chat latency.
  scheduleProfileUpdate({
    user: userTyped,
    newMessageContent: parsed.data.content,
    supabase,
  });

  // 6. Check if rolling summarization is needed
  let conversationSummaryText: string | null = null;

  if (conv.summary) {
    // Parse the stored JSON summary into a readable string for the prompt
    try {
      const summaryObj = typeof conv.summary === "string"
        ? (JSON.parse(conv.summary) as ConversationSummary)
        : (conv.summary as ConversationSummary);
      conversationSummaryText = `Key decisions: ${summaryObj.key_decisions.join("; ")}. Open questions: ${summaryObj.open_questions.join("; ")}.`;
    } catch {
      conversationSummaryText = conv.summary as string;
    }
  }

  if (messageCount >= SUMMARIZATION_THRESHOLD && messageCount % SUMMARIZATION_THRESHOLD === 0) {
    // Time to summarize — compress older messages
    void triggerSummarization(conversationId, recentMessages, conv.summary, supabase);
  }

  // 7. Load artifact metadata for context
  const { data: artifactMeta } = await supabase
    .from("artifacts")
    .select("id, type, status, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  // 8. Detect artifact trigger BEFORE deciding LLM strategy.
  //    If a contact session + trigger keyword matches, we skip the coaching
  //    LLM call entirely and let artifact generation be the single source of
  //    truth (preventing the chat-reply / artifact-body divergence bug from
  //    Session 8). Otherwise, run coaching as normal.
  const earlyTrigger = detectArtifactTrigger(parsed.data.content);
  const shouldGenerateArtifact = Boolean(earlyTrigger && contact);

  const artifactsCreated: Artifact[] = [];
  const artifactIds: string[] = [];
  let agentMessage = "";
  let coachingModelUsed = "n/a";

  if (shouldGenerateArtifact && earlyTrigger && contact) {
    // ---- Artifact path: skip coaching, generate the artifact only ----
    try {
      // For meeting_prep, fetch company intel first
      let companyIntelRaw: string | undefined;
      if (earlyTrigger === "meeting_prep" && contact.company) {
        try {
          const intel = await searchCompanyIntel(contact.company);
          companyIntelRaw = intel.raw_context;
        } catch {
          // Non-fatal — continue without intel
        }
      }

      // Pull approved learnings — Phase C self-improvement signal that
      // gets injected into the outreach prompt
      const { data: approvedLearningsData } = await supabase
        .from("user_learnings")
        .select("learning")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(30);
      const approvedLearnings = (approvedLearningsData ?? []).map(
        (r) => r.learning as string
      );

      const genStart = Date.now();
      const genResult = await generateArtifact({
        artifact_type: earlyTrigger,
        context: {
          user_profile: {
            career_history: userTyped.career_history,
            education: userTyped.education,
            goals: userTyped.goals,
            networking_preferences: userTyped.networking_preferences,
          },
          user_memory: userTyped.user_memory,
          user_profile_md: userTyped.profile_md,
          approved_learnings: approvedLearnings,
          contact_profile: {
            name: contact.name,
            current_title: contact.current_title,
            company: contact.company,
            career_history: contact.career_history ?? [],
            education: contact.education ?? [],
            location: contact.location,
            profile_snapshot: contact.profile_snapshot,
          },
          conversation_summary: conversationSummaryText,
          recent_messages: recentMessages.map((m) => ({
            role: m.role as "user" | "agent",
            content: m.content,
          })),
          artifact_metadata: (artifactMeta ?? []).map((a) => ({
            id: a.id as string,
            type: a.type as ArtifactType,
            status: a.status as string,
            created_at: a.created_at as string,
          })),
          company_intel_raw: companyIntelRaw,
        },
        user_instructions: parsed.data.content,
      });

      logAiCall({
        route: `POST /api/conversations/[id]/messages (generate:${earlyTrigger})`,
        model: genResult.model_used,
        tokensInput: genResult.tokens_input,
        tokensOutput: genResult.tokens_output,
        latencyMs: Date.now() - genStart,
      });

      // Save artifact to DB
      const { data: savedArtifact, error: artifactError } = await supabase
        .from("artifacts")
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          conversation_id: conversationId,
          type: earlyTrigger,
          content: genResult.content,
          status: "draft",
          version: 1,
          metadata: { model_used: genResult.model_used },
        })
        .select()
        .single();

      if (!artifactError && savedArtifact) {
        artifactsCreated.push(savedArtifact as Artifact);
        artifactIds.push(savedArtifact.id as string);
        // Deterministic short reply — the artifact card carries the content
        agentMessage = ARTIFACT_INTRO[earlyTrigger](contact.name);
        coachingModelUsed = `deterministic+${genResult.model_used}`;
      } else {
        console.error("Failed to save artifact:", artifactError);
        agentMessage = ARTIFACT_FALLBACK_FAILURE(contact.name);
        coachingModelUsed = "deterministic-fallback";
      }
    } catch (err) {
      console.error("Artifact generation failed:", err);
      agentMessage = ARTIFACT_FALLBACK_FAILURE(contact.name);
      coachingModelUsed = "deterministic-fallback";
    }
  } else {
    // ---- Coaching path: no artifact trigger, run conversational LLM ----
    const aiStart = Date.now();
    try {
      const coachingResult = await processCoachingMessage({
        context: {
          user_profile: {
            career_history: userTyped.career_history,
            education: userTyped.education,
            goals: userTyped.goals,
            networking_preferences: userTyped.networking_preferences,
          },
          user_memory: userTyped.user_memory,
          user_profile_md: userTyped.profile_md,
          conversation_summary: conversationSummaryText,
          recent_messages: recentMessages.map((m) => ({
            role: m.role as "user" | "agent",
            content: m.content,
          })),
          contact_profile: contact
            ? {
                name: contact.name,
                current_title: contact.current_title,
                company: contact.company,
                career_history: contact.career_history ?? [],
                education: contact.education ?? [],
                location: contact.location,
                profile_snapshot: contact.profile_snapshot,
              }
            : undefined,
        },
        user_message: parsed.data.content,
      });

      logAiCall({
        route: "POST /api/conversations/[id]/messages (coaching)",
        model: coachingResult.model_used,
        tokensInput: coachingResult.tokens_input,
        tokensOutput: coachingResult.tokens_output,
        latencyMs: Date.now() - aiStart,
      });

      agentMessage = coachingResult.agent_message;
      coachingModelUsed = coachingResult.model_used;
    } catch (err) {
      // The LLM call failed (MiniMax key invalid, quota, timeout, network, ...).
      // Roll back the user message we just inserted so the conversation
      // doesn't end up with a hanging user-only bubble in the DB. Then return
      // the underlying reason so the UI can show something actionable.
      console.error("Coaching LLM call failed:", err);
      await supabase
        .from("conversation_messages")
        .delete()
        .eq("id", savedUserMessage.id);

      const reason =
        err instanceof Error ? err.message : "Unknown error";
      return internalError(`Coach is unavailable: ${reason}`);
    }
  }

  // Reference for the rest of the function — preserves prior shape
  void coachingModelUsed;

  // 10. Save agent message with artifact_ids
  const { data: savedAgentMessage, error: agentMsgError } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      role: "agent",
      content: agentMessage,
      artifacts_generated: artifactIds,
    })
    .select()
    .single();

  if (agentMsgError || !savedAgentMessage) {
    console.error("Failed to save agent message:", agentMsgError);
    return internalError("Failed to save agent response");
  }

  // 11. Touch conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  const response: SendMessageResponse = {
    data: {
      user_message: savedUserMessage as ConversationMessage,
      agent_message: savedAgentMessage as ConversationMessage,
      artifacts_created: artifactsCreated,
    },
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}

// ---------------------------------------------------------------------------
// Async profile_md updater — bootstrap on first chat, enrich on identity reveals
// ---------------------------------------------------------------------------

/**
 * Schedules a profile_md update via Next's after() hook. Decides between:
 *
 *   - BOOTSTRAP: profile_md is empty AND user has ≥3 prior messages →
 *     build the initial markdown from career/education/goals + last 30
 *     general-thread messages (the "about me" free-text seed).
 *
 *   - ENRICH: profile_md already exists AND the new message looks like
 *     identity disclosure (regex-gated) → merge the new context in.
 *
 * Both fire-and-forget. Failures log + leave profile_md untouched. The chat
 * response has already been sent, so the user sees nothing if either fails.
 */
function scheduleProfileUpdate(args: {
  user: User;
  newMessageContent: string;
  supabase: SupabaseServerClient;
}): void {
  const { user, newMessageContent, supabase } = args;
  const profileMd = user.profile_md ?? null;

  if (!profileMd || profileMd.trim().length === 0) {
    // Bootstrap path
    after(async () => {
      try {
        await bootstrapProfileMd(user, supabase);
      } catch (err) {
        console.error("Profile bootstrap failed:", err);
      }
    });
    return;
  }

  // Enrichment path — only if message looks identity-relevant
  if (looksLikeIdentityDisclosure(newMessageContent)) {
    after(async () => {
      try {
        const updated = await enrichProfile(profileMd, newMessageContent);
        if (updated && updated.trim().length > 0 && updated !== profileMd) {
          await supabase
            .from("users")
            .update({ profile_md: updated })
            .eq("id", user.id);
          console.log(`profile_md enriched for user ${user.id}`);
        }
      } catch (err) {
        console.error("Profile enrichment failed:", err);
      }
    });
  }
}

/**
 * Builds the initial profile_md from the user's structured data + recent
 * general-thread messages. Runs once per user. Idempotency guard: if another
 * concurrent request already populated profile_md, we don't overwrite.
 */
async function bootstrapProfileMd(
  user: User,
  supabase: SupabaseServerClient
): Promise<void> {
  // Race guard — re-read profile_md before writing
  const { data: fresh } = await supabase
    .from("users")
    .select("profile_md")
    .eq("id", user.id)
    .single();
  if (fresh?.profile_md && (fresh.profile_md as string).trim().length > 0) {
    // Another request beat us to it
    return;
  }

  // Find user's general thread (most recent) and pull their last user-role
  // messages. We only count user messages — agent replies don't seed identity.
  const { data: generalConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "general")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let aboutText = "";
  let userMessageCount = 0;

  if (generalConv) {
    const { data: msgs } = await supabase
      .from("conversation_messages")
      .select("content, role, created_at")
      .eq("conversation_id", generalConv.id as string)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(30);

    const userMsgs = (msgs ?? []) as Array<{ content: string }>;
    userMessageCount = userMsgs.length;
    // Reverse so oldest first — natural reading order for the LLM
    aboutText = userMsgs
      .reverse()
      .map((m) => m.content)
      .join("\n\n---\n\n");
  }

  // Threshold: don't fire for users who've barely used the product.
  // 3 user messages is enough signal to extract identity.
  if (userMessageCount < 3 && (!user.career_history || user.career_history.length === 0)) {
    return;
  }

  const profileMd = await buildInitialProfile({
    career_history: user.career_history ?? [],
    education: user.education ?? [],
    goals: user.goals,
    networking_preferences: user.networking_preferences,
    about_text: aboutText || undefined,
  });

  if (!profileMd || profileMd.trim().length === 0) {
    console.warn(`Profile bootstrap returned empty markdown for user ${user.id}`);
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ profile_md: profileMd })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to save bootstrapped profile_md:", error);
  } else {
    console.log(
      `profile_md bootstrapped for user ${user.id} (${profileMd.length} chars from ${userMessageCount} messages)`
    );
  }
}

// ---------------------------------------------------------------------------
// Async summarization helper
// ---------------------------------------------------------------------------

async function triggerSummarization(
  conversationId: string,
  recentMessages: ConversationMessage[],
  existingSummary: Conversation["summary"],
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    let existingSummaryObj: ConversationSummary | null = null;
    if (existingSummary) {
      existingSummaryObj =
        typeof existingSummary === "string"
          ? (JSON.parse(existingSummary) as ConversationSummary)
          : (existingSummary as ConversationSummary);
    }

    const newSummary = await summarizeConversation({
      messages: recentMessages.map((m) => ({
        role: m.role as "user" | "agent",
        content: m.content,
      })),
      existing_summary: existingSummaryObj,
    });

    await supabase
      .from("conversations")
      .update({ summary: newSummary })
      .eq("id", conversationId);
  } catch (err) {
    console.error("Summarization failed for conversation", conversationId, err);
  }
}
