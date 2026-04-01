/**
 * GET    /api/goals/[id]  — Get a single goal
 * PUT    /api/goals/[id]  — Update a goal
 * DELETE /api/goals/[id]  — Delete a goal
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  target_companies: ["Sequoia", "KKR", "Blackstone", "Apollo", "BCG"],
  target_roles: ["Associate", "Senior Associate"],
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

  const response: GetGoalResponse = {
    data: { ...MOCK_GOAL, id },
    error: null,
  };

  return NextResponse.json(response);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = UpdateGoalSchema.safeParse(body);
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

  const response: UpdateGoalResponse = {
    data: {
      ...MOCK_GOAL,
      id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    error: null,
  };

  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  void id;

  const response: DeleteGoalResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}
