/**
 * GET  /api/contacts  — List contacts with optional filters
 * POST /api/contacts  — Create a new contact
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  ListContactsResponse,
  CreateContactResponse,
} from "@/types/api";
import type { Contact } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum(["discovered", "contacted", "connected", "met", "ongoing"])
    .optional(),
  company: z.string().optional(),
  tier: z.coerce.number().int().min(1).max(3).optional(),
  discovered_after: z.string().optional(),
  sort_by: z
    .enum(["relevance_score", "discovered_at", "last_interaction_at"])
    .optional()
    .default("discovered_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  linkedin_url: z.string().url().optional(),
  current_role: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z.enum(["discovery", "manual_chat", "manual_url", "extension_bookmark"]),
  notes: z.string().max(2000).optional(),
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
  career_history: [
    {
      title: "VP of Investments",
      company: "Sequoia Capital",
      start_date: "2022-03",
      end_date: null,
    },
    {
      title: "Senior Associate",
      company: "McKinsey & Company",
      start_date: "2018-09",
      end_date: "2022-02",
    },
  ],
  education: [
    {
      school: "INSEAD",
      degree: "MBA",
      year: "2022",
      campus: "Fontainebleau",
    },
  ],
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
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListContactsQuerySchema.safeParse(rawQuery);
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

  // TODO: Replace with real Supabase query
  // const supabase = await getSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return unauthorized();
  // let query = supabase.from('contacts').select('*', { count: 'exact' }).eq('user_id', user.id);
  // if (parsed.data.status) query = query.eq('status', parsed.data.status);
  // ...apply other filters, pagination, sort...

  const response: ListContactsResponse = {
    data: {
      items: [MOCK_CONTACT],
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

  const parsed = CreateContactSchema.safeParse(body);
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

  // TODO: Implement real contact creation
  // Check for duplicate (user_id, linkedin_url) before insert
  // If duplicate, merge profile data and return existing contact

  const mockNewContact: Contact = {
    ...MOCK_CONTACT,
    id: `contact-${Date.now()}`,
    name: parsed.data.name,
    linkedin_url: parsed.data.linkedin_url ?? null,
    current_role: parsed.data.current_role ?? null,
    company: parsed.data.company ?? null,
    location: parsed.data.location ?? null,
    source: parsed.data.source,
    notes: parsed.data.notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    discovered_at: new Date().toISOString(),
    relevance_score: null,
    tier: null,
    scoring_breakdown: null,
  };

  const response: CreateContactResponse = {
    data: mockNewContact,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
