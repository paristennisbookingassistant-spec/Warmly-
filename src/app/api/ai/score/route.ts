/**
 * POST /api/ai/score
 * Scores a contact against the authenticated user's profile.
 * Uses Claude Haiku (Tier 1 model) — fast and cheap for batch scoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ScoreContactResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ScoreContactSchema = z.object({
  contact_id: z.string().uuid("contact_id must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Mock data — realistic scoring response for frontend development
// ---------------------------------------------------------------------------

const MOCK_RESPONSE: ScoreContactResponse = {
  data: {
    contact_id: "contact-123",
    overall_score: 8.2,
    tier: 1,
    scores: {
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
      "We both attended INSEAD and you are following a similar consulting-to-VC path.",
    scored_at: new Date().toISOString(),
  },
  error: null,
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // TODO: Replace with real auth check
  // const supabase = await getSupabaseServerClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }

  const parsed = ScoreContactSchema.safeParse(body);
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

  // TODO: Implement real scoring
  // const contact = await fetchContact(parsed.data.contact_id, user.id);
  // const userProfile = await fetchUserProfile(user.id);
  // const scoringInput = buildScoringInput(userProfile, contact);
  // const score = await scoreContact(scoringInput);
  // await upsertContactScore(contact.id, user.id, score);
  // return NextResponse.json({ data: { ...score, contact_id: contact.id, scored_at: new Date().toISOString() }, error: null });

  return NextResponse.json({
    ...MOCK_RESPONSE,
    data: { ...MOCK_RESPONSE.data!, contact_id: parsed.data.contact_id },
  });
}
