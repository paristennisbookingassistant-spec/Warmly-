/**
 * GET  /api/goals  — List networking goals for authenticated user
 * POST /api/goals  — Create a new goal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { ListGoalsResponse, CreateGoalResponse } from "@/types/api";
import type { NetworkingGoal } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const CreateGoalSchema = z.object({
  goal_type: z.enum([
    "job_search",
    "industry_exploration",
    "relationship_building",
    "other",
  ]),
  description: z.string().min(1).max(1000),
  target_companies: z.array(z.string()).optional().default([]),
  target_roles: z.array(z.string()).optional().default([]),
  target_contacts_per_month: z.number().int().min(0).max(100),
  target_meetings_per_month: z.number().int().min(0).max(50),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: goals, error } = await supabase
    .from("networking_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("goals GET error:", error);
    return internalError("Failed to fetch goals");
  }

  // Recompute progress from real data for each goal
  const goalsWithProgress = await Promise.all(
    (goals ?? []).map(async (goal) => {
      const progress = await computeGoalProgress(user.id, supabase);
      return { ...(goal as NetworkingGoal), progress };
    })
  );

  const response: ListGoalsResponse = {
    data: goalsWithProgress,
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

  const parsed = CreateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { data: newGoal, error: insertError } = await supabase
    .from("networking_goals")
    .insert({
      user_id: user.id,
      goal_type: parsed.data.goal_type,
      description: parsed.data.description,
      target_companies: parsed.data.target_companies,
      target_roles: parsed.data.target_roles,
      target_contacts_per_month: parsed.data.target_contacts_per_month,
      target_meetings_per_month: parsed.data.target_meetings_per_month,
      progress: {
        contacts_found: 0,
        messages_sent: 0,
        meetings_held: 0,
        responses_received: 0,
      },
      status: "active",
    })
    .select()
    .single();

  if (insertError || !newGoal) {
    console.error("goals POST error:", insertError);
    return internalError("Failed to create goal");
  }

  const response: CreateGoalResponse = {
    data: newGoal as NetworkingGoal,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}

// ---------------------------------------------------------------------------
// Progress computation helper
// Progress is computed from real Contacts/Artifacts data — not manually entered.
// See PRD Section 5.6 Flow 4.
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
