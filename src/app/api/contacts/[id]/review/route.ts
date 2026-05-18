/**
 * PATCH /api/contacts/[id]/review
 *
 * Records the user's triage decision from the Tinder-style swipe deck.
 * Accepts: { action: "save" | "skip" | "star" }
 *
 * Translates to user_action column:
 *   save  → "saved"   (visible in /contacts)
 *   skip  → "skipped" (hidden from /contacts but data preserved)
 *   star  → "starred" (saved + caller navigates to outreach drafter)
 *
 * Also sets reviewed_at = now() so future analytics can measure
 * triage velocity.
 *
 * Returns the updated contact row (truncated to the fields the deck UI
 * needs) so the client can optimistically render the next state.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { ContactUserAction } from "@/types/database";

const InputSchema = z.object({
  action: z.enum(["save", "skip", "star", "undo"]),
});

// "undo" maps back to pending — used by the 5s undo pill in the deck.
// Resets reviewed_at to NULL too so analytics doesn't double-count.
const ACTION_TO_USER_ACTION: Record<
  z.infer<typeof InputSchema>["action"],
  ContactUserAction
> = {
  save: "saved",
  skip: "skipped",
  star: "starred",
  undo: "pending",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

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
      "Invalid review action",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const userAction = ACTION_TO_USER_ACTION[parsed.data.action];
  // undo restores the contact to pre-review state — null reviewed_at so
  // it looks fresh again in the deck. Other actions stamp the time.
  const reviewedAt =
    parsed.data.action === "undo" ? null : new Date().toISOString();

  // RLS protects against cross-user updates, but also explicitly scope
  // the update so a wrong-user request returns "not found" rather than
  // a generic update-of-zero-rows silent-success.
  const { data, error } = await supabase
    .from("contacts")
    .update({
      user_action: userAction,
      reviewed_at: reviewedAt,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_action, reviewed_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return notFound("Contact");
    }
    console.error("PATCH contact review failed:", error);
    return internalError("Failed to record review action");
  }

  return NextResponse.json({
    data,
    error: null,
  });
}
