/**
 * GET  /api/goals  — List user's networking goals
 * POST /api/goals  — Create a new goal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_GOAL: NetworkingGoal = {
  id: "goal-1",
  user_id: "user-abc",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
  goal_type: "job_search",
  description:
    "Land an Associate or Senior Associate role at a top PE/VC fund or strategy consulting firm in Singapore or London by September 2026.",
  target_companies: ["Sequoia", "KKR", "Blackstone", "Apollo", "BCG", "McKinsey", "Bain"],
  target_roles: ["Associate", "Senior Associate", "VP"],
  target_contacts_per_month: 8,
  target_meetings_per_month: 4,
  progress: {
    contacts_found: 12,
    messages_sent: 5,
    meetings_held: 2,
    responses_received: 3,
  },
  status: "active",
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest): Promise<NextResponse> {
  // TODO: Implement real query
  // Also recompute progress from real Contacts/Artifacts data:
  // contacts_found = COUNT(contacts WHERE user_id = ? AND discovered_at >= period_start)
  // messages_sent = COUNT(artifacts WHERE type IN ('outreach_draft','connection_note') AND status = 'sent')
  // meetings_held = COUNT(artifacts WHERE type = 'meeting_notes')
  // responses_received = COUNT(artifacts WHERE artifact_outcome = 'response_received')

  const response: ListGoalsResponse = {
    data: [MOCK_GOAL],
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = CreateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const newGoal: NetworkingGoal = {
    id: `goal-${Date.now()}`,
    user_id: "user-abc",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...parsed.data,
    progress: {
      contacts_found: 0,
      messages_sent: 0,
      meetings_held: 0,
      responses_received: 0,
    },
    status: "active",
  };

  const response: CreateGoalResponse = {
    data: newGoal,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
