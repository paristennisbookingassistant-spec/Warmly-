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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { processCoachingMessage } from "@/lib/ai/coaching";
import { generateArtifact } from "@/lib/ai/generation";
import { summarizeConversation, SUMMARIZATION_THRESHOLD } from "@/lib/ai/context";
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

  // 8. Call coaching AI
  const aiStart = Date.now();
  const coachingResult = await processCoachingMessage({
    context: {
      user_profile: {
        career_history: userTyped.career_history,
        education: userTyped.education,
        goals: userTyped.goals,
        networking_preferences: userTyped.networking_preferences,
      },
      user_memory: userTyped.user_memory,
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

  // 9. Generate artifact if triggered
  const artifactsCreated: Artifact[] = [];
  const artifactIds: string[] = [];

  if (coachingResult.trigger_artifact && contact) {
    try {
      // For meeting_prep, fetch company intel
      let companyIntelRaw: string | undefined;
      if (coachingResult.trigger_artifact === "meeting_prep" && contact.company) {
        try {
          const intel = await searchCompanyIntel(contact.company);
          companyIntelRaw = intel.raw_context;
        } catch {
          // Non-fatal — continue without intel
        }
      }

      const genStart = Date.now();
      const genResult = await generateArtifact({
        artifact_type: coachingResult.trigger_artifact,
        context: {
          user_profile: {
            career_history: userTyped.career_history,
            education: userTyped.education,
            goals: userTyped.goals,
            networking_preferences: userTyped.networking_preferences,
          },
          user_memory: userTyped.user_memory,
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
        route: `POST /api/conversations/[id]/messages (generate:${coachingResult.trigger_artifact})`,
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
          type: coachingResult.trigger_artifact,
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
      }
    } catch (err) {
      console.error("Artifact generation failed:", err);
      // Continue — return coaching response without artifact
    }
  }

  // 10. Save agent message with artifact_ids
  const { data: savedAgentMessage, error: agentMsgError } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      role: "agent",
      content: coachingResult.agent_message,
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
