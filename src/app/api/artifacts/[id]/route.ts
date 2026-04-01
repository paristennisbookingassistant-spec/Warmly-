/**
 * GET    /api/artifacts/[id]  — Get a single artifact
 * PUT    /api/artifacts/[id]  — Update artifact content, status, or outcome
 * DELETE /api/artifacts/[id]  — Delete an artifact
 *
 * The PUT handler tracks user_edit_distance for the agent learning system.
 * When status changes to 'sent', the contact's status auto-progresses to 'contacted'.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  GetArtifactResponse,
  UpdateArtifactResponse,
  DeleteArtifactResponse,
} from "@/types/api";
import type { Artifact } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateArtifactSchema = z.object({
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "finalized", "sent", "archived"]).optional(),
  artifact_outcome: z
    .enum(["no_response", "response_received", "meeting_booked", "referral_received"])
    .optional(),
  user_edit_distance: z.number().int().min(0).optional(),
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

  // TODO: Implement real fetch

  const response: GetArtifactResponse = {
    data: { ...MOCK_ARTIFACT, id },
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

  const parsed = UpdateArtifactSchema.safeParse(body);
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

  // TODO: Implement real update logic:
  // 1. Increment version if content changed
  // 2. If status → 'sent' and type is outreach: update contact.status to 'contacted'
  // 3. If user_edit_distance provided: trigger style extraction (lib/ai/context.ts)
  //    to update user_memory on the Users table
  // 4. If artifact_outcome set: check if outcome learning threshold reached (every 20 artifacts)
  //    If so, run outcome pattern analysis → update user_memory.learned_patterns

  const currentVersion = MOCK_ARTIFACT.version;
  const newVersion =
    parsed.data.content !== undefined ? currentVersion + 1 : currentVersion;

  const response: UpdateArtifactResponse = {
    data: {
      ...MOCK_ARTIFACT,
      id,
      ...parsed.data,
      version: newVersion,
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

  // TODO: Implement real delete

  const response: DeleteArtifactResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}
