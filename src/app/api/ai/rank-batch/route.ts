/**
 * POST /api/ai/rank-batch
 *
 * Ranks a batch of contacts against the authenticated user's profile in a
 * SINGLE LLM call. The key difference from /api/ai/score (per-contact):
 *
 *   - Per-contact scoring can't compare candidates against each other.
 *     There's no notion of "Aurélien is stronger than Marie because they
 *     share the Bain → VC pivot AND a Singapore stint."
 *   - Batch ranking compares all candidates together AND uses profile_md
 *     (the user's narrative identity) as the primary "who is the user"
 *     signal — which is what makes the ranking feel earned.
 *
 * The rationale per pick is shown to the user in the UI (popup discovery
 * results, contact card). Specific rationale → trustworthy ranking.
 *
 * Persists relevance_score, tier, recommendation_reason (= rationale),
 * and suggested_hook to each contact, then returns the rankings.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { rankContactsBatch } from "@/lib/ai/scoring";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type { Contact, User } from "@/types/database";

const InputSchema = z.object({
  contact_ids: z
    .array(z.string().uuid())
    .min(1, "At least one contact_id required")
    .max(30, "Cannot rank more than 30 candidates at once"),
  /** Optional cap on how many ranked picks to return. Defaults to 10. */
  top_n: z.number().int().min(1).max(20).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Load contacts (filtered to this user — RLS belt-and-braces)
  const { data: contactsData } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .in("id", parsed.data.contact_ids);

  const contacts = (contactsData ?? []) as Contact[];
  if (contacts.length === 0) {
    return NextResponse.json({
      data: { rankings: [] },
      error: null,
    });
  }

  // Load user (with profile_md)
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) return internalError("User profile not found");
  const userTyped = userData as User;

  // Run the batch ranking
  const start = Date.now();
  let rankings;
  try {
    rankings = await rankContactsBatch({
      user_profile: {
        career_history: userTyped.career_history,
        education: userTyped.education,
        goals: userTyped.goals,
        networking_preferences: userTyped.networking_preferences,
      },
      user_profile_md: userTyped.profile_md,
      user_memory: userTyped.user_memory,
      candidates: contacts.map((c) => ({
        contact_id: c.id,
        profile: {
          name: c.name,
          current_title: c.current_title,
          company: c.company,
          career_history: c.career_history ?? [],
          education: c.education ?? [],
          location: c.location,
          profile_snapshot: c.profile_snapshot,
        },
      })),
      topN: parsed.data.top_n ?? 10,
    });
  } catch (err) {
    console.error("Batch ranking failed:", err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return internalError(`Ranking failed: ${reason}`);
  }

  logAiCall({
    route: "POST /api/ai/rank-batch",
    model: "MiniMax-M2.7-highspeed-reasoning",
    tokensInput: 0,
    tokensOutput: 0,
    latencyMs: Date.now() - start,
  });

  // Persist scores + rationale to each contact in parallel.
  // recommendation_reason already exists in the contacts table — we reuse
  // it for the per-pick rationale so the existing detail-page sidebar
  // ("Coach's take") and contact card just light up automatically.
  await Promise.all(
    rankings.map((r) =>
      supabase
        .from("contacts")
        .update({
          relevance_score: r.score,
          tier: r.tier,
          recommendation_reason: r.reasoning,
          suggested_hook: r.hook,
        })
        .eq("id", r.contact_id)
        .eq("user_id", user.id)
    )
  );

  return NextResponse.json({
    data: { rankings },
    error: null,
  });
}
