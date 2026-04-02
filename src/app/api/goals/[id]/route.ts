/**
 * GET    /api/goals/[id]  — Get a single goal with computed progress
 * PUT    /api/goals/[id]  — Update goal fields
 * DELETE /api/goals/[id]  — Delete a goal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  GetGoalResponse,
  UpdateGoalResponse,
  DeleteGoalResponse,
} from "@/types/api";
import type { NetworkingGoal } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateGoalSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  target_companies: z.array(z.string()).optional(),
  target_roles: z.array(z.string()).optional(),
  target_contacts_per_month: z.number().int().min(0).max(100).optional(),
  target_meetings_per_month: z.number().int().min(0).max(50).optional(),
  status: z.enum(["active", "paused", "achieved"]).optional(),
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

  const { data: goal, error } = await supabase
    .from("networking_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !goal) {
    return notFound("Goal");
  }

  // Recompute progress from real data
  const progress = await computeGoalProgress(user.id, supabase);

  const response: GetGoalResponse = {
    data: { ...(goal as NetworkingGoal), progress },
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

  const parsed = UpdateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("networking_goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Goal");

  const { data: updatedGoal, error: updateError } = await supabase
    .from("networking_goals")
    .update({ ...parsed.data })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updatedGoal) {
    console.error("goals PUT error:", updateError);
    return internalError("Failed to update goal");
  }

  const progress = await computeGoalProgress(user.id, supabase);

  const response: UpdateGoalResponse = {
    data: { ...(updatedGoal as NetworkingGoal), progress },
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

  const { data: existing } = await supabase
    .from("networking_goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Goal");

  const { error } = await supabase
    .from("networking_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("goals DELETE error:", error);
    return internalError("Failed to delete goal");
  }

  const response: DeleteGoalResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// Progress computation helper — same as in goals/route.ts
// ---------------------------------------------------------------------------

async function computeGoalProgress(
  userId: string,
  supabase: SupabaseServerClient
): Promise<{
  contacts_found: number;
  messages_sent: number;
  meetings_held: number;
  responses_received: number;
}> {
  const [
    { count: contactsFound },
    { count: messagesSent },
    { count: meetingsHeld },
    { count: responsesReceived },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("type", ["outreach_draft", "connection_note"])
      .eq("status", "sent"),
    supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "meeting_notes"),
    supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("artifact_outcome", "response_received"),
  ]);

  return {
    contacts_found: contactsFound ?? 0,
    messages_sent: messagesSent ?? 0,
    meetings_held: meetingsHeld ?? 0,
    responses_received: responsesReceived ?? 0,
  };
}
