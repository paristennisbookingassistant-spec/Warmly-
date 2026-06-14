/**
 * GET    /api/contacts/[id]  — Get a single contact
 * PUT    /api/contacts/[id]  — Update a contact (partial update)
 * DELETE /api/contacts/[id]  — Delete a contact
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { scoreContact } from "@/lib/ai/scoring";
import { SCORING_RUBRIC } from "@/types/ai";
import {
  unauthorized,
  notFound,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  GetContactResponse,
  UpdateContactResponse,
  DeleteContactResponse,
} from "@/types/api";
import type { Contact, User } from "@/types/database";
import { computeNextTouchAt } from "@/lib/crm/cadence";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  linkedin_url: z.string().url().optional(),
  current_title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  status: z
    .enum(["discovered", "contacted", "connected", "met", "ongoing"])
    .optional(),
  notes: z.string().max(2000).optional(),
  user_feedback: z.enum(["great_match", "not_relevant"]).optional(),
  /** CRM relationship category — null clears to uncategorized */
  relationship_category: z
    .enum(["nurturing", "keep_warm", "inner_circle", "dormant"])
    .nullable()
    .optional(),
  /** Per-contact cadence override in days (≥ 1); null clears to category default */
  cadence_days: z.number().int().min(1).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Route params type
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !contact) {
    return notFound("Contact");
  }

  const response: GetContactResponse = {
    data: contact as Contact,
    error: null,
  };

  return NextResponse.json(response);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = UpdateContactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Verify the contact belongs to this user; also fetch CRM + interaction
  // fields so we can recompute next_touch_at when category/cadence changes.
  const { data: existing } = await supabase
    .from("contacts")
    .select(
      "id, company, current_title, career_history, education, location, last_interaction_at, relationship_category, cadence_days"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Contact");

  // Build update payload — start with the validated fields
  const updateFields: Record<string, unknown> = { ...parsed.data };

  // Recompute next_touch_at whenever relationship_category or cadence_days
  // is being written. Fall back to the contact's current stored values when
  // only one of the two CRM fields is included in the update body.
  const crmFieldsPresent =
    parsed.data.relationship_category !== undefined ||
    parsed.data.cadence_days !== undefined;

  if (crmFieldsPresent) {
    const incomingCategory =
      parsed.data.relationship_category !== undefined
        ? parsed.data.relationship_category
        : (existing.relationship_category as "nurturing" | "keep_warm" | "inner_circle" | "dormant" | null);

    const incomingOverride =
      parsed.data.cadence_days !== undefined
        ? parsed.data.cadence_days
        : (existing.cadence_days as number | null);

    const lastInteraction = existing.last_interaction_at as string | null;

    updateFields.next_touch_at = computeNextTouchAt(
      incomingCategory,
      incomingOverride,
      lastInteraction
    );
  }

  const { data: updatedContact, error: updateError } = await supabase
    .from("contacts")
    .update(updateFields)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !updatedContact) {
    console.error("contacts PUT error:", updateError);
    return internalError("Failed to update contact");
  }

  // Re-score if significant profile fields changed
  const significantFields = ["company", "current_title", "location"] as const;
  const hasSignificantChange = significantFields.some(
    (field) => parsed.data[field] !== undefined
  );

  if (hasSignificantChange) {
    void triggerRescore(user.id, id, updatedContact as Contact, supabase);
  }

  const response: UpdateContactResponse = {
    data: updatedContact as Contact,
    error: null,
  };

  return NextResponse.json(response);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Verify ownership before delete
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return notFound("Contact");

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("contacts DELETE error:", error);
    return internalError("Failed to delete contact");
  }

  const response: DeleteContactResponse = {
    data: { deleted: true },
    error: null,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// Async re-scoring helper
// ---------------------------------------------------------------------------

async function triggerRescore(
  userId: string,
  contactId: string,
  contact: Contact,
  supabase: SupabaseServerClient
): Promise<void> {
  try {
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!userData) return;

    const userTyped = userData as User;

    const score = await scoreContact({
      user_profile: {
        career_history: userTyped.career_history,
        education: userTyped.education,
        goals: userTyped.goals,
        networking_preferences: userTyped.networking_preferences,
      },
      contact_profile: {
        name: contact.name,
        current_title: contact.current_title,
        company: contact.company,
        career_history: contact.career_history ?? [],
        education: contact.education ?? [],
        location: contact.location,
        profile_snapshot: contact.profile_snapshot,
      },
      rubric: SCORING_RUBRIC,
    });

    await supabase
      .from("contacts")
      .update({
        relevance_score: score.overall_score,
        tier: score.tier,
        scoring_breakdown: score.scores,
        recommendation_reason: score.recommendation_reason,
        suggested_hook: score.suggested_hook,
      })
      .eq("id", contactId)
      .eq("user_id", userId);

    await supabase.from("contact_scores").insert({
      contact_id: contactId,
      user_id: userId,
      overall_score: score.overall_score,
      tier: score.tier,
      scores: score.scores,
      recommendation_reason: score.recommendation_reason,
      suggested_hook: score.suggested_hook,
      model_used: "MiniMax-M2.7-highspeed",
    });
  } catch (err) {
    console.error("Re-score failed for contact", contactId, err);
  }
}
