/**
 * POST /api/ai/score
 * Scores a contact against the authenticated user's profile.
 * Uses MiniMax FAST tier — fast and cheap for batch scoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scoreContact } from "@/lib/ai/scoring";
import { SCORING_RUBRIC } from "@/types/ai";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type { ScoreContactResponse } from "@/types/api";
import type { Contact, User } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ScoreContactSchema = z.object({
  contact_id: z.string().uuid("contact_id must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = ScoreContactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Load contact — verify ownership
  const { data: contactData } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", parsed.data.contact_id)
    .eq("user_id", user.id)
    .single();

  if (!contactData) return notFound("Contact");

  const contact = contactData as Contact;

  // Load user profile
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) return internalError("User profile not found");

  const userTyped = userData as User;

  // Call scoring engine
  const start = Date.now();
  let score;
  try {
    score = await scoreContact({
      user_profile: {
        career_history: userTyped.career_history,
        education: userTyped.education,
        goals: userTyped.goals,
        networking_preferences: userTyped.networking_preferences,
      },
      contact_profile: {
        name: contact.name,
        current_title: contact.current_title,
        company: contact.company,
        career_history: contact.career_history ?? [],
        education: contact.education ?? [],
        location: contact.location,
        profile_snapshot: contact.profile_snapshot,
      },
      rubric: SCORING_RUBRIC,
    });
  } catch (err) {
    console.error("Scoring AI call failed:", err);
    return internalError("Scoring failed — AI service unavailable");
  }

  logAiCall({
    route: "POST /api/ai/score",
    model: "MiniMax-M2.7-highspeed",
    tokensInput: 0, // scoreContact doesn't return token counts yet
    tokensOutput: 0,
    latencyMs: Date.now() - start,
  });

  const scoredAt = new Date().toISOString();

  // Persist score to contacts table
  await supabase
    .from("contacts")
    .update({
      relevance_score: score.overall_score,
      tier: score.tier,
      scoring_breakdown: score.scores,
      recommendation_reason: score.recommendation_reason,
      suggested_hook: score.suggested_hook,
    })
    .eq("id", contact.id)
    .eq("user_id", user.id);

  // Persist score to contact_scores audit table
  await supabase.from("contact_scores").insert({
    contact_id: contact.id,
    user_id: user.id,
    overall_score: score.overall_score,
    tier: score.tier,
    scores: score.scores,
    recommendation_reason: score.recommendation_reason,
    suggested_hook: score.suggested_hook,
    model_used: "MiniMax-M2.7-highspeed",
    scored_at: scoredAt,
  });

  const response: ScoreContactResponse = {
    data: {
      ...score,
      contact_id: contact.id,
      scored_at: scoredAt,
    },
    error: null,
  };

  return NextResponse.json(response);
}
