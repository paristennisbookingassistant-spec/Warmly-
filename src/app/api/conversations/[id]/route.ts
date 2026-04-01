/**
 * GET  /api/conversations/[id]  — Get a single conversation
 * PUT  /api/conversations/[id]  — Update title or status
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CONVERSATION: Conversation = {
  id: "conv-contact-1",
  user_id: "user-abc",
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T11:00:00Z",
  type: "contact_session",
  contact_id: "contact-123",
  title: "Marie Chen — Sequoia",
  status: "active",
  summary: null,
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

  // TODO: Implement real fetch with auth check

  const response: GetConversationResponse = {
    data: { ...MOCK_CONVERSATION, id },
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

  const parsed = UpdateConversationSchema.safeParse(body);
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

  const response: UpdateConversationResponse = {
    data: {
      ...MOCK_CONVERSATION,
      id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    },
    error: null,
  };

  return NextResponse.json(response);
}
