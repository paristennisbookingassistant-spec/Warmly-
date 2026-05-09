/**
 * POST /api/users/me/onboarding-complete
 *
 * Called by the Onboarding component when the user finishes the conversational
 * setup flow. Server-side this:
 *
 *   1. Updates networking_preferences.style from the picked style option
 *   2. Builds the initial profile_md from structured fields + the free-text
 *      "about you" / "goal" / "gaps" answers
 *   3. Saves profile_md to users.profile_md so the coach can read it on
 *      subsequent chat turns
 *
 * Idempotent — calling twice rebuilds profile_md from the latest answers.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildInitialProfile } from "@/lib/ai/profile";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { User, NetworkingPreferences } from "@/types/database";

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

  const { about, goal, style, gaps } = parsed.data;

  // Load the current user row so buildInitialProfile sees structured fields
  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!userRow) return internalError("User row not found");
  const userTyped = userRow as User;

  // Compose the free-text "about" seed for the profile builder.
  const aboutParts: string[] = [];
  if (about) aboutParts.push(`About me (in my own words):\n${about}`);
  if (goal) aboutParts.push(`My current networking goal:\n${goal}`);
  if (gaps && gaps.length > 0) {
    aboutParts.push(`Where I think my network is weakest: ${gaps.join(", ")}`);
  }
  const aboutText = aboutParts.length > 0 ? aboutParts.join("\n\n") : undefined;

  // Update networking_preferences.style if the user picked one.
  if (style?.k) {
    const currentPrefs: NetworkingPreferences =
      userTyped.networking_preferences ?? {
        style: "warm",
        outreach_comfort: 3,
        contacts_per_week: 2,
        preferred_channels: ["linkedin"],
      };
    const updatedPrefs: NetworkingPreferences = {
      ...currentPrefs,
      style: style.k,
    };
    const { error: prefsErr } = await supabase
      .from("users")
      .update({ networking_preferences: updatedPrefs })
      .eq("id", user.id);
    if (prefsErr) {
      console.error("Failed to update networking_preferences:", prefsErr);
      // Non-fatal — keep going so we still attempt profile_md
    }
  }

  // Build the markdown profile.
  let profileMd: string;
  try {
    profileMd = await buildInitialProfile({
      career_history: userTyped.career_history ?? [],
      education: userTyped.education ?? [],
      goals: userTyped.goals,
      networking_preferences: userTyped.networking_preferences,
      about_text: aboutText,
    });
  } catch (err) {
    console.error("buildInitialProfile failed:", err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return internalError(`Could not build profile: ${reason}`);
  }

  if (!profileMd || profileMd.trim().length === 0) {
    return internalError("Profile builder returned empty markdown");
  }

  // Persist.
  const { error: saveErr } = await supabase
    .from("users")
    .update({ profile_md: profileMd })
    .eq("id", user.id);
  if (saveErr) {
    console.error("Failed to save profile_md:", saveErr);
    return internalError("Could not save profile");
  }

  return NextResponse.json(
    {
      data: {
        profile_md: profileMd,
        length: profileMd.length,
      },
      error: null,
    },
    { status: 200 }
  );
}
