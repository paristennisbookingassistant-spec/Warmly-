/**
 * POST /api/directory/rank
 *
 * Ranks a batch of INSEAD directory profiles against the authenticated user's
 * profile in a single LLM call. Results are NOT persisted — this is a live,
 * per-user scoring call used to order the discovery deck before the user saves
 * anyone.
 *
 * Body: { directory_ids: string[] (1–25), top_n?: number }
 *
 * Response: { data: { rankings: [{ directory_id, score, tier, reasoning, hook, rank }] }, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { rankContactsBatch } from "@/lib/ai/scoring";
import type { BatchRankCandidate } from "@/lib/ai/scoring";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
  logAiCall,
} from "@/lib/api/helpers";
import type { RankDirectoryResponse } from "@/types/directory";
import type { DirectoryProfile } from "@/types/directory";
import type { User } from "@/types/database";

// Vercel: cold-start safe timeout for MiniMax reasoning calls
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const RankDirectorySchema = z.object({
  directory_ids: z
    .array(z.string().uuid())
    .min(1, "At least one directory_id required")
    .max(25, "Cannot rank more than 25 candidates at once"),
  top_n: z.number().int().min(1).max(25).optional(),
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

  const parsed = RankDirectorySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { directory_ids, top_n } = parsed.data;

  // 1. Load directory profiles (RLS allows authenticated read)
  const { data: profilesData, error: profilesError } = await supabase
    .from("directory_profiles")
    .select("*")
    .in("id", directory_ids);

  if (profilesError) {
    console.error("directory rank: profiles load error:", profilesError);
    return internalError("Failed to load directory profiles");
  }

  const profiles = (profilesData ?? []) as DirectoryProfile[];

  if (profiles.length === 0) {
    const response: RankDirectoryResponse = {
      data: { rankings: [] },
      error: null,
    };
    return NextResponse.json(response);
  }

  // 2. Load user profile (profile_md, user_memory, career_history, education, goals, networking_preferences)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select(
      "profile_md, user_memory, career_history, education, goals, networking_preferences"
    )
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    console.error("directory rank: user load error:", userError);
    return internalError("User profile not found");
  }

  const userTyped = userData as Pick<
    User,
    | "profile_md"
    | "user_memory"
    | "career_history"
    | "education"
    | "goals"
    | "networking_preferences"
  >;

  // 3. Build BatchRankCandidate[] — contact_id = directory id
  const candidates: BatchRankCandidate[] = profiles.map((p) => ({
    contact_id: p.id,
    profile: {
      name: p.name,
      current_title: p.current_title ?? null,
      company: p.company ?? null,
      // Map experience → career_history (same JSONB shape in the scoring engine)
      career_history: (p.experience ?? []).map((e) => ({
        title: e.title,
        company: e.company,
        start_date: e.dateRange?.start ?? "",
        end_date: e.dateRange?.end ?? null,
        description: e.description,
      })),
      // Map education_v2 → education
      education: (p.education_v2 ?? []).map((e) => ({
        school: e.school,
        degree: e.degree ?? "",
        field: e.fieldOfStudy,
        year: e.dateRange?.end ?? "",
      })),
      location: p.location ?? null,
      profile_snapshot: null,
    },
  }));

  // 4. Call the shared batch ranking engine
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
      candidates,
      topN: top_n ?? Math.min(candidates.length, 10),
    });
  } catch (err) {
    console.error("directory rank: batch ranking failed:", err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return internalError(`Ranking failed: ${reason}`);
  }

  logAiCall({
    route: "POST /api/directory/rank",
    model: "MiniMax-M2.7-highspeed-reasoning",
    tokensInput: 0,
    tokensOutput: 0,
    latencyMs: Date.now() - start,
  });

  // 5. Map BatchRankResult.contact_id → directory_id and return (NOT persisted)
  const response: RankDirectoryResponse = {
    data: {
      rankings: rankings.map((r) => ({
        directory_id: r.contact_id,
        score: r.score,
        tier: r.tier,
        reasoning: r.reasoning,
        hook: r.hook,
        rank: r.rank,
      })),
    },
    error: null,
  };

  return NextResponse.json(response);
}
