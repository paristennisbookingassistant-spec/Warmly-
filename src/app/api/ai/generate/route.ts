/**
 * POST /api/ai/generate
 * Generates an artifact for a contact in a conversation context.
 * Routes to Haiku or Sonnet based on artifact type (PRD Section 5.4.1).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateArtifact } from "@/lib/ai/generation";
import { searchCompanyIntel } from "@/lib/search";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type { GenerateArtifactResponse } from "@/types/api";
import type { Contact, User, ConversationMessage, Conversation } from "@/types/database";
import type { ConversationSummary } from "@/types/ai";

// Allow up to 60s for the (possibly cold-start) MiniMax generation call.
// Without this, the default serverless function timeout fires on the first
// cold invocation of a session before MiniMax responds, returning a platform
// 500 ("first draft 500s, retry works"). See V2 P2 tester finding.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ArtifactTypeEnum = z.enum([
  "connection_note",
  "outreach_draft",
  "meeting_prep",
  "meeting_notes",
  "action_plan",
  "follow_up_draft",
]);

const GenerateArtifactSchema = z.object({
  artifact_type: ArtifactTypeEnum,
  contact_id: z.string().uuid("contact_id must be a valid UUID"),
  conversation_id: z.string().uuid("conversation_id must be a valid UUID"),
  // Raised from 1000 → 8000 so meeting-notes synthesis can pass the user's
  // full raw notes as the instruction. Backward-compatible (only widens).
  user_instructions: z.string().max(8000).optional(),
  force_reasoning_model: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = GenerateArtifactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { artifact_type, contact_id, conversation_id, user_instructions, force_reasoning_model } =
    parsed.data;

  // Load contact, conversation, and user profile in parallel
  const [
    { data: contactData },
    { data: conversationData },
    { data: userData },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single(),
    supabase.from("users").select("*").eq("id", user.id).single(),
  ]);

  if (!contactData) return notFound("Contact");
  if (!conversationData) return notFound("Conversation");
  if (!userData) return internalError("User profile not found");

  const contact = contactData as Contact;
  const conversation = conversationData as Conversation;
  const userTyped = userData as User;

  // Load recent messages for context
  const { data: recentMessagesData } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentMessages = (
    (recentMessagesData ?? []) as ConversationMessage[]
  ).reverse();

  // Load artifact metadata for context
  const { data: artifactMeta } = await supabase
    .from("artifacts")
    .select("id, type, status, created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Parse conversation summary
  let conversationSummaryText: string | null = null;
  if (conversation.summary) {
    try {
      const summaryObj =
        typeof conversation.summary === "string"
          ? (JSON.parse(conversation.summary) as ConversationSummary)
          : (conversation.summary as ConversationSummary);
      conversationSummaryText = `Key decisions: ${summaryObj.key_decisions.join("; ")}. Open questions: ${summaryObj.open_questions.join("; ")}.`;
    } catch {
      conversationSummaryText = conversation.summary as string;
    }
  }

  // For meeting_prep: fetch company intel
  let companyIntelRaw: string | undefined;
  if (artifact_type === "meeting_prep" && contact.company) {
    try {
      const intel = await searchCompanyIntel(contact.company);
      companyIntelRaw = intel.raw_context;
    } catch {
      // Non-fatal — proceed without intel
    }
  }

  // Call generation engine
  const start = Date.now();
  let genResult;
  try {
    genResult = await generateArtifact({
      artifact_type,
      context: {
        user_profile: {
          career_history: userTyped.career_history,
          education: userTyped.education,
          goals: userTyped.goals,
          networking_preferences: userTyped.networking_preferences,
        },
        user_memory: userTyped.user_memory,
        // The rich CV-built identity narrative (schools, city, goal, transition
        // story). Without this the outreach prompt only sees the structured
        // columns and the model refuses, asking for context it should have had.
        user_profile_md: userTyped.profile_md,
        contact_profile: {
          name: contact.name,
          current_title: contact.current_title,
          company: contact.company,
          career_history: contact.career_history ?? [],
          education: contact.education ?? [],
          location: contact.location,
          profile_snapshot: contact.profile_snapshot,
          source: contact.source,
        },
        conversation_summary: conversationSummaryText,
        recent_messages: recentMessages.map((m) => ({
          role: m.role as "user" | "agent",
          content: m.content,
        })),
        artifact_metadata: (artifactMeta ?? []).map((a) => ({
          id: a.id as string,
          type: a.type as string,
          status: a.status as string,
          created_at: a.created_at as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
        company_intel_raw: companyIntelRaw,
      },
      user_instructions,
      force_reasoning_model,
    });
  } catch (err) {
    console.error("Artifact generation failed:", err);
    return internalError("Generation failed — AI service unavailable");
  }

  logAiCall({
    route: `POST /api/ai/generate (${artifact_type})`,
    model: genResult.model_used,
    tokensInput: genResult.tokens_input,
    tokensOutput: genResult.tokens_output,
    latencyMs: Date.now() - start,
  });

  // Save artifact to DB
  const { data: savedArtifact, error: insertError } = await supabase
    .from("artifacts")
    .insert({
      user_id: user.id,
      contact_id: contact.id,
      conversation_id,
      type: artifact_type,
      content: genResult.content,
      status: "draft",
      version: 1,
      metadata: { model_used: genResult.model_used },
    })
    .select()
    .single();

  if (insertError || !savedArtifact) {
    console.error("Failed to save artifact:", insertError);
    return internalError("Failed to save generated artifact");
  }

  const response: GenerateArtifactResponse = {
    data: {
      artifact_id: savedArtifact.id as string,
      content: genResult.content,
      model_used: genResult.model_used,
      tokens_input: genResult.tokens_input,
      tokens_output: genResult.tokens_output,
    },
    error: null,
  };

  return NextResponse.json(response);
}
