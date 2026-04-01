/**
 * GET  /api/artifacts  — List artifacts with optional filters
 * POST /api/artifacts  — Create a new artifact (manual creation)
 *
 * Note: Most artifacts are created via /api/ai/generate, not this endpoint.
 * This route is for manual artifact creation and bulk listing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ARTIFACT: Artifact = {
  id: "artifact-456",
  user_id: "user-abc",
  contact_id: "contact-123",
  conversation_id: "conv-contact-1",
  created_at: "2026-04-01T10:01:30Z",
  updated_at: "2026-04-01T10:01:30Z",
  type: "connection_note",
  content: {
    message:
      "Hi Marie, I came across your profile and was impressed by your transition from McKinsey to Sequoia. As a fellow INSEAD MBA targeting VC, I would love to connect.",
    hook: "shared INSEAD background",
    char_count: 194,
  },
  status: "draft",
  version: 1,
  artifact_outcome: null,
  user_edit_distance: null,
  metadata: { hook_used: "shared_alma_mater" },
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListArtifactsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  // TODO: Implement real query
  // Group results by type for Contact detail page display

  const response: ListArtifactsResponse = {
    data: {
      items: [MOCK_ARTIFACT],
      total: 1,
      page: parsed.data.page,
      per_page: parsed.data.per_page,
      has_more: false,
    },
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

  const parsed = CreateArtifactSchema.safeParse(body);
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

  const newArtifact: Artifact = {
    ...MOCK_ARTIFACT,
    id: `artifact-${Date.now()}`,
    contact_id: parsed.data.contact_id,
    conversation_id: parsed.data.conversation_id,
    type: parsed.data.type,
    content: parsed.data.content,
    metadata: parsed.data.metadata,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const response: CreateArtifactResponse = {
    data: newArtifact,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
