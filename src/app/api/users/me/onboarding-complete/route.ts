/**
 * POST /api/users/me/onboarding-complete
 *
 * Called by the Onboarding component when the user finishes (or skips)
 * the conversational setup flow.
 *
 * Two parallel write paths from this single endpoint:
 *
 *   1. IDENTITY signals (about, goal, CV text, career assessment) feed
 *      profile_md via buildInitialProfile. Slow-changing identity narrative.
 *
 *   2. VOICE signals (past message samples, cover letter text) feed
 *      voice_md via buildInitialVoice. Continuously updated voice/tone
 *      narrative. Distinct from profile_md to prevent voice updates from
 *      drifting identity content.
 *
 * Also:
 *   - Saves raw materials to users.onboarding_materials (so user can
 *     view/edit later in Settings, and so re-builds can replay the
 *     same source data).
 *   - Populates users.goals.target_industries / target_companies /
 *     target_geographies / target_roles from the structured target
 *     inputs in the materials step.
 *   - Sets users.onboarded = true (or false, if called from the
 *     "Replay onboarding" button which sends onboarded: false).
 *
 * Idempotent. Calling twice rebuilds both profile_md and voice_md from
 * the latest answers.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildInitialProfile, buildInitialVoice } from "@/lib/ai/profile";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  User,
  NetworkingPreferences,
  UserGoals,
  OnboardingMaterials,
} from "@/types/database";

const MaterialsSchema = z.object({
  cv: z.string().trim().max(20000).optional(),
  past_messages: z.string().trim().max(15000).optional(),
  cover_letter: z.string().trim().max(8000).optional(),
  career_assessment: z
    .object({
      text: z.string().trim().max(8000),
      kind: z.enum(["CareerLeader", "MBTI", "Hogan", "DISC", "Other"]),
    })
    .optional(),
  target_preferences: z
    .object({
      industries: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
      companies: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
      geographies: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
      roles: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    })
    .optional(),
});

const OnboardingAnswersSchema = z.object({
  agentName: z.string().trim().max(60).optional(),
  about: z.string().trim().max(8000).optional(),
  goal: z.string().trim().max(2000).optional(),
  style: z
    .object({
      k: z.string(),
      label: z.string().optional(),
      hint: z.string().optional(),
    })
    .optional(),
  gaps: z.array(z.string()).max(20).optional(),
  extension: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
  materials: MaterialsSchema.optional(),
  /**
   * Optional explicit onboarded flag. Defaults to true (normal submission).
   * The "Replay onboarding" button sends false to re-enter the wizard.
   */
  onboarded: z.boolean().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = OnboardingAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid onboarding answers",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Special case: "Replay onboarding" sends { onboarded: false } and
  // nothing else. Flip the flag and exit; don't rebuild anything.
  if (parsed.data.onboarded === false) {
    const { error: resetErr } = await supabase
      .from("users")
      .update({ onboarded: false })
      .eq("id", user.id);
    if (resetErr) {
      console.error("Failed to flip onboarded=false:", resetErr);
      return internalError("Could not reset onboarding state");
    }
    return NextResponse.json(
      { data: { onboarded: false }, error: null },
      { status: 200 }
    );
  }

  const { about, goal, style, gaps, materials } = parsed.data;

  // Load the current user row so buildInitialProfile sees structured fields
  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!userRow) return internalError("User row not found");
  const userTyped = userRow as User;

  // Compose the free-text seed for the profile builder.
  const aboutParts: string[] = [];
  if (about) aboutParts.push(`About me (in my own words):\n${about}`);
  if (goal) aboutParts.push(`My current networking goal:\n${goal}`);
  if (gaps && gaps.length > 0) {
    aboutParts.push(`Where I think my network is weakest: ${gaps.join(", ")}`);
  }
  if (materials?.career_assessment?.text) {
    aboutParts.push(
      `Career assessment (${materials.career_assessment.kind}):\n${materials.career_assessment.text}`
    );
  }
  const aboutText = aboutParts.length > 0 ? aboutParts.join("\n\n") : undefined;

  // Update networking_preferences.style if the user picked one.
  let updatedPrefs: NetworkingPreferences | null = null;
  if (style?.k) {
    const currentPrefs: NetworkingPreferences =
      userTyped.networking_preferences ?? {
        style: "warm",
        outreach_comfort: 3,
        contacts_per_week: 2,
        preferred_channels: ["linkedin"],
      };
    updatedPrefs = { ...currentPrefs, style: style.k };
  }

  // Merge target preferences from materials into users.goals.
  let updatedGoals: UserGoals | null = null;
  if (materials?.target_preferences) {
    const t = materials.target_preferences;
    const currentGoals: UserGoals = userTyped.goals ?? {
      type: "other",
      target_industries: [],
      target_companies: [],
      target_roles: [],
      target_geographies: [],
    };
    updatedGoals = {
      ...currentGoals,
      target_industries: t.industries ?? currentGoals.target_industries,
      target_companies: t.companies ?? currentGoals.target_companies,
      target_geographies: t.geographies ?? currentGoals.target_geographies,
      target_roles: t.roles ?? currentGoals.target_roles,
    };
  }

  // Build the onboarding_materials record we persist (includes timestamps).
  const nowIso = new Date().toISOString();
  const persistedMaterials: OnboardingMaterials = {
    ...userTyped.onboarding_materials,
    ...(materials?.cv ? { cv: materials.cv } : {}),
    ...(materials?.past_messages ? { past_messages: materials.past_messages } : {}),
    ...(materials?.cover_letter ? { cover_letter: materials.cover_letter } : {}),
    ...(materials?.career_assessment
      ? { career_assessment: materials.career_assessment }
      : {}),
    uploaded_at: {
      ...(userTyped.onboarding_materials?.uploaded_at ?? {}),
      ...(materials?.cv ? { cv: nowIso } : {}),
      ...(materials?.past_messages ? { past_messages: nowIso } : {}),
      ...(materials?.cover_letter ? { cover_letter: nowIso } : {}),
      ...(materials?.career_assessment ? { career_assessment: nowIso } : {}),
    },
  };

  // Build identity profile_md (with CV text if provided).
  let profileMd: string;
  try {
    profileMd = await buildInitialProfile({
      career_history: userTyped.career_history ?? [],
      education: userTyped.education ?? [],
      goals: updatedGoals ?? userTyped.goals,
      networking_preferences: updatedPrefs ?? userTyped.networking_preferences,
      about_text: aboutText,
      cv_text: materials?.cv,
      voice_samples: undefined, // NEVER feed voice samples into identity profile
    });
  } catch (err) {
    console.error("buildInitialProfile failed:", err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return internalError(`Could not build profile: ${reason}`);
  }

  if (!profileMd || profileMd.trim().length === 0) {
    return internalError("Profile builder returned empty markdown");
  }

  // Build voice_md from samples (returns null if no samples — that's fine).
  let voiceMd: string | null = userTyped.voice_md ?? null;
  if (materials?.past_messages || materials?.cover_letter) {
    try {
      voiceMd = await buildInitialVoice({
        past_messages: materials?.past_messages,
        cover_letter: materials?.cover_letter,
        profile_md_context: profileMd.slice(0, 1500),
      });
    } catch (err) {
      console.error("buildInitialVoice failed (non-fatal):", err);
      // Non-fatal — voice_md stays at its previous value
    }
  }

  // Persist everything atomically.
  const updatePayload: Record<string, unknown> = {
    profile_md: profileMd,
    voice_md: voiceMd,
    onboarding_materials: persistedMaterials,
    onboarded: true,
  };
  if (updatedPrefs) updatePayload.networking_preferences = updatedPrefs;
  if (updatedGoals) updatePayload.goals = updatedGoals;

  const { error: saveErr } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", user.id);
  if (saveErr) {
    console.error("Failed to save onboarding state:", saveErr);
    return internalError("Could not save profile");
  }

  return NextResponse.json(
    {
      data: {
        profile_md: profileMd,
        profile_length: profileMd.length,
        voice_md: voiceMd,
        voice_length: voiceMd?.length ?? 0,
        onboarded: true,
      },
      error: null,
    },
    { status: 200 }
  );
}
