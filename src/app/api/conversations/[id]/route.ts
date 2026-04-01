/**
 * GET    /api/conversations/[id]  — Get a single conversation with recent messages
 * PUT    /api/conversations/[id]  — Update title or status
 * DELETE /api/conversations/[id]  — Delete conversation and all its messages
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  GetConversationResponse,
  UpdateConversationResponse,
} from "@/types/api";
import type { Conversation } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !conversation) {
    return notFound("Conversation");
  }

  const response: GetConversationResponse = {
    data: conversation as Conversation,
    error: null,
  };

  return NextResponse.json(response);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = UpdateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Conversation");

  const { data: updatedConversation, error: updateError } = await supabase
    .from("conversations")
    .update({ ...parsed.data })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updatedConversation) {
    console.error("conversations PUT error:", updateError);
    return internalError("Failed to update conversation");
  }

  const response: UpdateConversationResponse = {
    data: updatedConversation as Conversation,
    error: null,
  };

  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Verify ownership
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Conversation");

  // CASCADE DELETE removes messages and artifacts via FK
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("conversations DELETE error:", error);
    return internalError("Failed to delete conversation");
  }

  return NextResponse.json({ data: { deleted: true }, error: null });
}
