/**
 * GET  /api/contacts  — List contacts with optional filters
 * POST /api/contacts  — Create a new contact
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scoreContact } from "@/lib/ai/scoring";
import { SCORING_RUBRIC } from "@/types/ai";
import {
  unauthorized,
  notFound,
  validationError,
  badRequest,
  internalError,
  buildPaginatedResponse,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  ListContactsResponse,
  CreateContactResponse,
} from "@/types/api";
import type { Contact, User } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z
    .enum(["discovered", "contacted", "connected", "met", "ongoing"])
    .optional(),
  company: z.string().optional(),
  tier: z.coerce.number().int().min(1).max(3).optional(),
  discovered_after: z.string().optional(),
  sort_by: z
    .enum(["relevance_score", "discovered_at", "last_interaction_at"])
    .optional()
    .default("discovered_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  linkedin_url: z.string().url().optional(),
  current_role: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  source: z.enum(["discovery", "manual_chat", "manual_url", "extension_bookmark"]),
  notes: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListContactsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { page, per_page, status, company, tier, discovered_after, sort_by, sort_order, search } =
    parsed.data;

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (status) query = query.eq("status", status);
  if (company) query = query.ilike("company", `%${company}%`);
  if (tier) query = query.eq("tier", tier);
  if (discovered_after) query = query.gte("discovered_at", discovered_after);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,current_role.ilike.%${search}%`
    );
  }

  // Handle nullable sort columns — null values always go last
  const ascending = sort_order === "asc";
  query = query
    .order(sort_by, { ascending, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("contacts GET error:", error);
    return internalError("Failed to fetch contacts");
  }

  const response: ListContactsResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as Contact[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = CreateContactSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { name, linkedin_url, current_role, company, location, source, notes } =
    parsed.data;

  // Check for duplicate (user_id, linkedin_url) if URL provided
  if (linkedin_url) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .eq("linkedin_url", linkedin_url)
      .single();

    if (existing) {
      return badRequest("A contact with this LinkedIn URL already exists");
    }
  }

  const now = new Date().toISOString();
  const { data: newContact, error: insertError } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      name,
      linkedin_url: linkedin_url ?? null,
      current_role: current_role ?? null,
      company: company ?? null,
      location: location ?? null,
      source,
      notes: notes ?? null,
      status: "discovered",
      discovered_at: now,
      career_history: [],
      education: [],
    })
    .select()
    .single();

  if (insertError || !newContact) {
    console.error("contacts POST insert error:", insertError);
    return internalError("Failed to create contact");
  }

  // Fire-and-forget async scoring — does not block the response
  void triggerAsyncScoring(user.id, newContact.id as string, supabase);

  const response: CreateContactResponse = {
    data: newContact as Contact,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}

// ---------------------------------------------------------------------------
// Async scoring helper — runs after contact creation
// ---------------------------------------------------------------------------

async function triggerAsyncScoring(
  userId: string,
  contactId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  try {
    const [{ data: contact }, { data: userData }] = await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .eq("user_id", userId)
        .single(),
      supabase.from("users").select("*").eq("id", userId).single(),
    ]);

    if (!contact || !userData) return;

    const userTyped = userData as User;

    const scoringInput = {
      user_profile: {
        career_history: userTyped.career_history,
        education: userTyped.education,
        goals: userTyped.goals,
        networking_preferences: userTyped.networking_preferences,
      },
      contact_profile: {
        name: contact.name,
        current_role: contact.current_role,
        company: contact.company,
        career_history: contact.career_history ?? [],
        education: contact.education ?? [],
        location: contact.location,
        profile_snapshot: contact.profile_snapshot,
      },
      rubric: SCORING_RUBRIC,
    };

    const score = await scoreContact(scoringInput);

    // Update contact with score
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

    // Insert into contact_scores audit table
    await supabase.from("contact_scores").insert({
      contact_id: contactId,
      user_id: userId,
      overall_score: score.overall_score,
      tier: score.tier,
      scores: score.scores,
      recommendation_reason: score.recommendation_reason,
      suggested_hook: score.suggested_hook,
      model_used: "claude-haiku-4-5",
    });
  } catch (err) {
    // Non-critical — log and swallow
    console.error("Async scoring failed for contact", contactId, err);
  }
}
