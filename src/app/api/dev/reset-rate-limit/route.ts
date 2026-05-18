/**
 * POST /api/dev/reset-rate-limit
 *
 * Dev-only endpoint used by the headless tester so test runs aren't
 * blocked by the daily discovery rate limit. Gated to emails in the
 * TEST_USER_EMAILS env var.
 *
 * The discovery rate limit (MAX_SESSIONS_PER_DAY, MIN_HOURS_BETWEEN_SESSIONS)
 * is enforced client-side in the Chrome extension via chrome.storage.local.
 * This endpoint doesn't directly touch that — there's no server-side
 * rate limit state in the DB to reset.
 *
 * But discovery_sessions IS server-side, and per the rate-limiter
 * implementation, a "session started today" is detected by counting
 * recent discovery_sessions rows for the user. So we can flip the
 * server-visible state by deleting today's rows.
 *
 * For client-side (chrome.storage.local) limits, the tester clears
 * them directly via $B js or via a service-worker message. This
 * endpoint just handles the DB side.
 *
 * Returns: { reset: true, deleted_sessions: <count> }
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

  // Compute "today" boundary for the user's session count
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  // Delete sessions from today so the rate limiter sees 0 sessions used.
  // Per RLS, this only affects the calling user's rows.
  const { data, error } = await supabase
    .from("discovery_sessions")
    .delete()
    .eq("user_id", user.id)
    .gte("started_at", since.toISOString())
    .select("id");

  if (error) {
    console.error("reset-rate-limit delete failed:", error);
    return internalError("Failed to reset rate limit");
  }

  return NextResponse.json({
    data: {
      reset: true,
      deleted_sessions: (data ?? []).length,
    },
    error: null,
  });
}
