/**
 * POST /api/dev/reset-onboarding
 *
 * Dev-only endpoint used by the headless tester. Sets users.onboarded
 * = false for the calling user, AND clears onboarding_materials,
 * profile_md, voice_md, so the next sign-in walks through onboarding
 * fresh.
 *
 * Gated to emails in the TEST_USER_EMAILS env var (comma-separated).
 * Any other user hitting this gets 403. This keeps the endpoint safe
 * to ship to production — only test accounts can use it.
 *
 * Why this exists:
 *   - Onboarding can only be tested on a fresh account (not yet onboarded)
 *   - Without this, every onboarding test would require creating a new
 *     account, which is annoying and pollutes the user list
 *   - With this, the tester resets the test account before every run
 *     and walks the wizard repeatably
 *
 * Returns: { reset: true } on success, or 403 if email not whitelisted.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  forbidden,
  internalError,
} from "@/lib/api/helpers";

function isWhitelistedEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.TEST_USER_EMAILS || "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return allowed.includes(email.toLowerCase());
}

export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  if (!isWhitelistedEmail(user.email)) {
    return forbidden();
  }

  const { error } = await supabase
    .from("users")
    .update({
      onboarded: false,
      onboarding_materials: {},
      profile_md: null,
      voice_md: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("reset-onboarding update failed:", error);
    return internalError("Failed to reset onboarding state");
  }

  return NextResponse.json({
    data: { reset: true, email: user.email },
    error: null,
  });
}
