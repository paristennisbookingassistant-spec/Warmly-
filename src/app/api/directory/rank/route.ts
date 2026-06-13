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

  // 3. Read-through cache: return already-scored profiles instantly, and only
  // run the (slow, variable ~15-45s) LLM rank on the never-scored ones. The
  // first successful rank sticks, so repeat opens are instant.
  interface ScoreRow { directory_id: string; score: number; tier: number; reasoning: string; hook: string }
  const cached: ScoreRow[] = [];
  const { data: cachedData } = await supabase
    .from("directory_scores")
    .select("directory_profile_id, score, tier, reasoning, hook")
    .eq("user_id", user.id)
    .in("directory_profile_id", directory_ids);
  for (const r of cachedData ?? []) {
    cached.push({
      directory_id: r.directory_profile_id as string,
      score: Number(r.score ?? 0),
      tier: Number(r.tier ?? 3),
      reasoning: String(r.reasoning ?? ""),
      hook: String(r.hook ?? ""),
    });
  }
  const cachedIds = new Set(cached.map((c) => c.directory_id));
  const uncached = profiles.filter((p) => !cachedIds.has(p.id));

  const fresh: ScoreRow[] = [];
  if (uncached.length > 0) {
    const candidates: BatchRankCandidate[] = uncached.map((p) => ({
      contact_id: p.id,
      profile: {
        name: p.name,
        current_title: p.current_title ?? null,
        company: p.company ?? null,
        career_history: (p.experience ?? []).map((e) => ({
          title: e.title,
          company: e.company,
          start_date: e.dateRange?.start ?? "",
          end_date: e.dateRange?.end ?? null,
          description: e.description,
        })),
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

    const start = Date.now();
    try {
      const rankings = await rankContactsBatch({
        user_profile: {
          career_history: userTyped.career_history,
          education: userTyped.education,
          goals: userTyped.goals,
          networking_preferences: userTyped.networking_preferences,
        },
        user_profile_md: userTyped.profile_md,
        user_memory: userTyped.user_memory,
        candidates,
        topN: candidates.length,
      });
      for (const r of rankings) {
        fresh.push({ directory_id: r.contact_id, score: r.score, tier: r.tier, reasoning: r.reasoning, hook: r.hook });
      }
      logAiCall({ route: "POST /api/directory/rank", model: "MiniMax-M2.7-highspeed-reasoning", tokensInput: 0, tokensOutput: 0, latencyMs: Date.now() - start });

      // Persist the fresh scores (best-effort; RLS allows own rows).
      if (fresh.length > 0) {
        await supabase.from("directory_scores").upsert(
          fresh.map((f) => ({ user_id: user.id, directory_profile_id: f.directory_id, score: f.score, tier: f.tier, reasoning: f.reasoning, hook: f.hook, scored_at: new Date().toISOString() })),
          { onConflict: "user_id,directory_profile_id" }
        );
      }
    } catch (err) {
      // Non-essential enhancement: degrade to "cached-only" (or empty) rather
      // than 500 when the model can't return rankable JSON (e.g. no profile_md).
      console.warn("directory rank: live ranking unavailable, returning cached only:", err);
    }
  }

  // 4. Combine cached + fresh, re-rank by score desc, assign 1-based rank.
  const combined = [...cached, ...fresh].sort((a, b) => b.score - a.score);
  const response: RankDirectoryResponse = {
    data: {
      rankings: combined.map((r, i) => ({
        directory_id: r.directory_id,
        score: r.score,
        tier: (r.tier === 1 || r.tier === 2 ? r.tier : 3) as 1 | 2 | 3,
        reasoning: r.reasoning,
        hook: r.hook,
        rank: i + 1,
      })),
    },
    error: null,
  };

  return NextResponse.json(response);
}
