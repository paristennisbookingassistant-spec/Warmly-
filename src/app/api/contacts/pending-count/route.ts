/**
 * GET /api/contacts/pending-count
 *
 * Returns the count of pending_review contacts for the calling user.
 * Used by the sidebar to show the "Review" badge with a number.
 *
 * Cheap query (indexed on (user_id, user_action) WHERE user_action=
 * 'pending', see migration 20260518). Polled by the layout every ~30s
 * so the badge stays current as the extension saves new discoveries.
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorized, internalError } from "@/lib/api/helpers";

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { count, error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("user_action", "pending");

  if (error) {
    console.error("pending-count GET error:", error);
    return internalError("Failed to count pending contacts");
  }

  return NextResponse.json({
    data: { pending_count: count ?? 0 },
    error: null,
  });
}
