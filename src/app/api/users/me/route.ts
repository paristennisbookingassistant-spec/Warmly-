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
 * read path. PATCH is the canonical edit path for name, profile_md,
 * and voice_md after onboarding is complete.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  internalError,
} from "@/lib/api/helpers";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  profile_md: z.string().trim().max(20_000).optional(),
  voice_md: z.string().trim().max(10_000).optional(),
});

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

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, string> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.profile_md !== undefined) updatePayload.profile_md = parsed.data.profile_md;
  if (parsed.data.voice_md !== undefined) updatePayload.voice_md = parsed.data.voice_md;

  // No-op if the client sent no editable fields. Return current row.
  if (Object.keys(updatePayload).length === 0) {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, profile_md, voice_md")
      .eq("id", user.id)
      .single();
    return NextResponse.json({ data, error: null });
  }

  const { data, error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", user.id)
    .select("id, email, name, profile_md, voice_md")
    .single();

  if (error) {
    console.error("users/me PATCH failed:", error);
    return internalError("Failed to save profile");
  }
  return NextResponse.json({ data, error: null });
}
