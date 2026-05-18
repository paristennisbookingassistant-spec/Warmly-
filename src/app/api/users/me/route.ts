/**
 * GET /api/users/me
 *
 * Returns the calling user's row from the `users` table. Used by the
 * frontend layout to decide whether to show onboarding, and by Settings
 * later to render editable profile state.
 *
 * Returns only the fields the frontend needs — not the full row, since
 * some columns (career_history, education) can be large and aren't
 * needed for layout-level decisions.
 *
 * `POST /api/users/me/onboarding-complete` already exists for the
 * onboarding submission flow — this endpoint just exposes a clean
 * read path.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  internalError,
} from "@/lib/api/helpers";

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, onboarded, profile_md, voice_md, onboarding_materials, goals, networking_preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("users/me GET failed:", error);
    return internalError("Failed to load user profile");
  }

  return NextResponse.json({ data, error: null });
}
