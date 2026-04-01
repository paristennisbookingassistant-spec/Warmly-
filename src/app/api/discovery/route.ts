/**
 * GET  /api/discovery  — List discovery sessions
 * POST /api/discovery  — Start a new discovery session
 *
 * Rate limits enforced here AND in the extension service worker.
 * Hard limits: max 25 profiles/session, max 2 sessions/day. See PRD DIS-08.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  ListDiscoverySessionsResponse,
  StartDiscoveryResponse,
} from "@/types/api";
import type { DiscoverySession } from "@/types/database";

// ---------------------------------------------------------------------------
// Rate limit constants (mirrored in extension/service-worker/rate-limiter.ts)
// ---------------------------------------------------------------------------

export const MAX_PROFILES_PER_SESSION = 25;
export const MAX_SESSIONS_PER_DAY = 2;
/** Minimum milliseconds between sessions: 2 hours */
export const MIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListDiscoveryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.string().optional(),
});

const StartDiscoverySchema = z.object({
  conversation_id: z.string().uuid(),
  target_companies: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(10),
  max_profiles: z
    .number()
    .int()
    .min(1)
    .max(MAX_PROFILES_PER_SESSION)
    .optional()
    .default(MAX_PROFILES_PER_SESSION),
});

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_SESSION: DiscoverySession = {
  id: "disc-session-1",
  user_id: "user-abc",
  conversation_id: "conv-general-1",
  started_at: "2026-04-01T09:00:00Z",
  ended_at: null,
  target_companies: ["Sequoia", "KKR", "Blackstone"],
  search_strategy: {
    companies: ["Sequoia", "KKR", "Blackstone"],
    target_roles: ["Associate", "Senior Associate", "VP"],
    target_seniority: ["mid", "senior"],
    keywords: ["private equity", "venture capital", "INSEAD", "consulting"],
    max_profiles_per_company: 8,
    rationale:
      "Targeting consulting-to-PE/VC transitions at top-tier firms with Singapore presence",
  },
  profiles_viewed: 12,
  profiles_scored: 10,
  profiles_saved: 7,
  status: "running",
  rate_limit_remaining: 13,
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListDiscoveryQuerySchema.safeParse(rawQuery);
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

  const response: ListDiscoverySessionsResponse = {
    data: {
      items: [MOCK_SESSION],
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

  const parsed = StartDiscoverySchema.safeParse(body);
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

  // TODO: Implement real session creation
  // 1. Check today's session count — reject if >= MAX_SESSIONS_PER_DAY
  // 2. Check cooldown since last session — reject if < MIN_COOLDOWN_MS
  // 3. Call AI to generate search strategy from target_companies + user profile
  // 4. Create DiscoverySession record
  // 5. Return session so extension can start execution

  const newSession: DiscoverySession = {
    id: `disc-${Date.now()}`,
    user_id: "user-abc",
    conversation_id: parsed.data.conversation_id,
    started_at: new Date().toISOString(),
    ended_at: null,
    target_companies: parsed.data.target_companies,
    search_strategy: {
      companies: parsed.data.target_companies,
      target_roles: ["Associate", "Senior Associate", "VP"],
      target_seniority: ["mid", "senior"],
      keywords: ["consulting", "INSEAD", "MBA"],
      max_profiles_per_company: Math.floor(
        parsed.data.max_profiles / parsed.data.target_companies.length
      ),
      rationale: "AI-generated search strategy — TODO: implement",
    },
    profiles_viewed: 0,
    profiles_scored: 0,
    profiles_saved: 0,
    status: "running",
    rate_limit_remaining: parsed.data.max_profiles,
  };

  const response: StartDiscoveryResponse = {
    data: newSession,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}
