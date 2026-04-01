/**
 * GET  /api/artifacts  — List artifacts with optional filters
 * POST /api/artifacts  — Create a new artifact (manual creation)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  internalError,
  buildPaginatedResponse,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  ListArtifactsResponse,
  CreateArtifactResponse,
} from "@/types/api";
import type { Artifact } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListArtifactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  contact_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  type: z
    .enum([
      "connection_note",
      "outreach_draft",
      "meeting_prep",
      "meeting_notes",
      "action_plan",
      "follow_up_draft",
    ])
    .optional(),
  status: z.enum(["draft", "finalized", "sent", "archived"]).optional(),
});

const CreateArtifactSchema = z.object({
  contact_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  type: z.enum([
    "connection_note",
    "outreach_draft",
    "meeting_prep",
    "meeting_notes",
    "action_plan",
    "follow_up_draft",
  ]),
  content: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListArtifactsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { page, per_page, contact_id, conversation_id, type, status } =
    parsed.data;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabase
    .from("artifacts")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (contact_id) query = query.eq("contact_id", contact_id);
  if (conversation_id) query = query.eq("conversation_id", conversation_id);
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("artifacts GET error:", error);
    return internalError("Failed to fetch artifacts");
  }

  const response: ListArtifactsResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as Artifact[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = CreateArtifactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Verify the contact belongs to this user
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", parsed.data.contact_id)
    .eq("user_id", user.id)
    .single();

  if (!contact) {
    return validationError("contact_id does not exist or does not belong to you");
  }

  // Verify the conversation belongs to this user
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", parsed.data.conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return validationError("conversation_id does not exist or does not belong to you");
  }

  const { data: newArtifact, error: insertError } = await supabase
    .from("artifacts")
    .insert({
      user_id: user.id,
      contact_id: parsed.data.contact_id,
      conversation_id: parsed.data.conversation_id,
      type: parsed.data.type,
      content: parsed.data.content,
      metadata: parsed.data.metadata,
      status: "draft",
      version: 1,
    })
    .select()
    .single();

  if (insertError || !newArtifact) {
    console.error("artifacts POST error:", insertError);
    return internalError("Failed to create artifact");
  }

  const response: CreateArtifactResponse = {
    data: newArtifact as Artifact,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
