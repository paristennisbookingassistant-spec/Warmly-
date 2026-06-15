/**
 * POST /api/directory/save
 *
 * Copies an INSEAD directory profile into the authenticated user's contacts.
 * Idempotent: calling again for the same (user_id, directory_profile_id)
 * returns the existing contact with `already_saved: true` — no duplicate row.
 *
 * Body: { directory_id: string (uuid) }
 *
 * Response: { data: Contact, already_saved: boolean, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  notFound,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { SaveDirectoryResponse } from "@/types/directory";
import type { Contact } from "@/types/database";
import type { DirectoryProfile } from "@/types/directory";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const SaveDirectorySchema = z.object({
  directory_id: z.string().uuid("directory_id must be a valid UUID"),
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

  const parsed = SaveDirectorySchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { directory_id } = parsed.data;

  try {
  // 1. Load the directory profile (RLS allows authenticated read)
  const { data: dirProfile, error: dirError } = await supabase
    .from("directory_profiles")
    .select("*")
    .eq("id", directory_id)
    .single();

  if (dirError || !dirProfile) {
    return notFound("Directory profile");
  }

  const profile = dirProfile as DirectoryProfile;

  // 2. Idempotency check — return existing contact if already saved
  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .eq("directory_profile_id", directory_id)
    .single();

  if (existing) {
    const response: SaveDirectoryResponse = {
      data: existing as Contact,
      already_saved: true,
      error: null,
    };
    return NextResponse.json(response);
  }

  // 3. Insert a new contact row copying fields from the directory profile
  const now = new Date().toISOString();

  const { data: newContact, error: insertError } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      name: profile.name,
      current_title: profile.current_title ?? null,
      company: profile.company ?? null,
      location: profile.location ?? null,
      photo_url: profile.photo_url ?? null,
      avatar_url: profile.photo_url ?? null,
      linkedin_url: profile.linkedin_url ?? null,
      experience: profile.experience ?? [],
      education_v2: profile.education_v2 ?? [],
      phone: profile.phone ?? null,
      source: "cv_book" as const,
      directory_profile_id: directory_id,
      user_action: "saved" as const,
      status: "discovered" as const,
      reviewed_at: now,
      discovered_at: now,
      // Set education / career_history to empty arrays (cv_book uses experience/education_v2)
      career_history: [],
      education: [],
    })
    .select()
    .single();

  if (insertError || !newContact) {
    console.error("directory save insert error:", insertError);
    return internalError("Failed to save directory profile as contact");
  }

  const response: SaveDirectoryResponse = {
    data: newContact as Contact,
    already_saved: false,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("directory save unexpected error:", err);
    return internalError("Unexpected error saving directory profile");
  }
}
