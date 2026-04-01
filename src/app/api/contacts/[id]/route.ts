/**
 * GET    /api/contacts/[id]  — Get a single contact
 * PUT    /api/contacts/[id]  — Update a contact
 * DELETE /api/contacts/[id]  — Delete a contact
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  GetContactResponse,
  UpdateContactResponse,
  DeleteContactResponse,
} from "@/types/api";
import type { Contact } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  linkedin_url: z.string().url().optional(),
  current_role: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  status: z
    .enum(["discovered", "contacted", "connected", "met", "ongoing"])
    .optional(),
  notes: z.string().max(2000).optional(),
  user_feedback: z.enum(["great_match", "not_relevant"]).optional(),
});

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CONTACT: Contact = {
  id: "contact-123",
  user_id: "user-abc",
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
  linkedin_url: "https://linkedin.com/in/marie-chen-sample",
  name: "Marie Chen",
  current_role: "VP of Investments",
  company: "Sequoia Capital",
  location: "Singapore",
  career_history: [],
  education: [],
  profile_snapshot: null,
  relevance_score: 8.2,
  tier: 1,
  scoring_breakdown: {
    career_path_similarity: 9,
    shared_background: 9,
    seniority_relevance: 8,
    industry_match: 9,
    accessibility_signals: 7,
    recency: 8,
  },
  recommendation_reason:
    "INSEAD MBA '22, transitioned from McKinsey to Sequoia — exactly the path you are targeting.",
  suggested_hook:
    "We both went through INSEAD and you are following a similar consulting-to-VC path.",
  source: "manual_chat",
  status: "discovered",
  discovered_at: "2026-04-01T10:00:00Z",
  last_interaction_at: null,
  user_feedback: null,
  discovery_session_id: null,
  notes: null,
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
  // const supabase = await getSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return unauthorized();
  // const { data, error } = await supabase.from('contacts').select('*').eq('id', id).eq('user_id', user.id).single();
  // if (!data) return notFound();

  const response: GetContactResponse = {
    data: { ...MOCK_CONTACT, id },
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

  const parsed = UpdateContactSchema.safeParse(body);
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

  // TODO: Implement real update
  // Check stage auto-progression rules (PRD CRM-06):
  // - outreach_draft with status 'sent' → contact status becomes 'contacted'
  // - meeting_notes created → contact status becomes 'met'

  const response: UpdateContactResponse = {
    data: {
      ...MOCK_CONTACT,
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

  // TODO: Implement real delete (cascade removes artifacts and messages via FK)
  // const supabase = await getSupabaseServerClient();
  // await supabase.from('contacts').delete().eq('id', id).eq('user_id', user.id);

  void id; // used in real implementation

  const response: DeleteContactResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}
