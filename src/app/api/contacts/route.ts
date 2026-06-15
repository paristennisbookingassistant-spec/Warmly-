/**
 * GET  /api/contacts  — List contacts with optional filters
 * POST /api/contacts  — Create a new contact
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { scoreContact } from "@/lib/ai/scoring";
import { ModelTier, SCORING_RUBRIC } from "@/types/ai";
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
  /**
   * Comma-separated UUIDs. When present, restricts the result to exactly
   * these contacts. Used by the extension popup after batch ranking to
   * fetch display data (name, role, company) for the ranked picks.
   */
  ids: z.string().optional(),
  /**
   * Filter by the user's triage decision. When this filter is set
   * explicitly (e.g., the /review page uses user_action=pending), it
   * overrides the default "exclude pending/skipped" behavior below.
   */
  user_action: z.enum(["pending", "saved", "skipped", "starred"]).optional(),
  /**
   * When true, omit the heavy profile_snapshot column (used only on the
   * detail view). See LIST_COLUMNS comment below.
   */
  lite: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /**
   * Filter to contacts tagged with a specific discovery session.
   * Used by the Discover deck to poll for freshly scraped contacts
   * as the extension writes them during a company discovery run.
   * UUID format enforced; non-UUID values return a 400.
   */
  discovery_session_id: z.string().uuid().optional(),
});

const CreateContactSchema = z.object({
  name: z.string().min(1).max(200),
  linkedin_url: z.string().url().optional(),
  current_title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  avatar_url: z.string().url().nullish(),
  source: z.enum(["discovery", "manual_chat", "manual_url", "extension_bookmark"]),
  notes: z.string().max(2000).optional(),
  // Extension-populated fields
  profile_snapshot: z.record(z.string(), z.unknown()).nullish(),
  career_history: z.array(z.record(z.string(), z.unknown())).nullish(),
  education: z.array(z.record(z.string(), z.unknown())).nullish(),
  discovery_session_id: z.string().uuid().nullish(),
  /**
   * Triage state. Discovery-sourced contacts default to 'pending' so the
   * user reviews them in /review. Manual entries (manual_chat / manual_url
   * / extension_bookmark) default to NULL so they skip the deck and land
   * straight in /contacts.
   */
  user_action: z.enum(["pending", "saved", "skipped", "starred"]).optional(),
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

  const { page, per_page, status, company, tier, discovered_after, sort_by, sort_order, search, ids, user_action, lite, discovery_session_id } =
    parsed.data;

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  // `lite=true` skips the heavy profile_snapshot column (a large JSON blob
  // imported from LinkedIn) used only on /contacts/[id] detail view. The list
  // view doesn't render it, so requesting it on every list refresh inflates
  // payload size 5-10x for no benefit. career_history and education are kept
  // because ContactList.tsx reads them for context tag derivation. The detail
  // view continues to hit this route without `lite`, getting the full row.
  // Response shape: Partial<Contact>[] when lite=true (profile_snapshot absent).
  const LIST_COLUMNS = [
    "id",
    "user_id",
    "name",
    "current_title",
    "company",
    "location",
    "avatar_url",
    "tier",
    "relevance_score",
    "scoring_breakdown",
    "user_action",
    "recommendation_reason",
    "suggested_hook",
    "status",
    "source",
    "linkedin_url",
    "career_history",
    "education",
    "last_interaction_at",
    "created_at",
    "updated_at",
    "reviewed_at",
    "discovered_at",
    "discovery_session_id",
    "notes",
    "relationship_category",
    "cadence_days",
    "next_touch_at",
    "phone",
  ].join(", ");

  const columns = lite ? LIST_COLUMNS : "*";

  let query = supabase
    .from("contacts")
    .select(columns, { count: "exact" })
    .eq("user_id", user.id);

  // Triage filter:
  //   - Explicit ?user_action=pending → exactly that (used by /review page)
  //   - Explicit ?user_action=saved   → exactly that
  //   - ?discovery_session_id set (no user_action) → no triage filter at all.
  //     The Discover deck needs to see "pending" contacts as they arrive from
  //     the extension scrape. Suppressing the default exclusion means all
  //     triage states in the session are visible.
  //   - No param, no session filter   → exclude pending + skipped from the
  //     default listing. This keeps un-triaged or rejected contacts out of
  //     the main /contacts view. Legacy NULL rows pass through (treated as
  //     already-reviewed).
  if (user_action) {
    query = query.eq("user_action", user_action);
  } else if (!discovery_session_id) {
    query = query
      .or("user_action.is.null,user_action.not.in.(pending,skipped)");
  }

  if (status) query = query.eq("status", status);
  if (company) query = query.ilike("company", `%${company}%`);
  if (tier) query = query.eq("tier", tier);
  if (discovered_after) query = query.gte("discovered_at", discovered_after);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,current_title.ilike.%${search}%`
    );
  }
  if (ids) {
    const idList = ids
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 50);
    if (idList.length > 0) {
      query = query.in("id", idList);
    }
  }

  // Filter by discovery session — used by the Discover deck to poll for
  // contacts scraped by the extension during a company discovery run.
  // When this filter is present we skip the default user_action exclusion
  // so that newly-written "pending" contacts are immediately visible to
  // the deck without a separate ?user_action=pending param.
  if (discovery_session_id) {
    query = query.eq("discovery_session_id", discovery_session_id);
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
      // When lite=true, profile_snapshot is absent; cast via unknown to satisfy
      // the Contact[] signature — callers that need the full shape must omit lite.
      (data ?? []) as unknown as Contact[],
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

  const {
    name,
    linkedin_url,
    current_title,
    company,
    location,
    avatar_url,
    source,
    notes,
    profile_snapshot,
    career_history,
    education,
    discovery_session_id,
    user_action: explicitUserAction,
  } = parsed.data;

  // Default triage state: discovered contacts go through the swipe deck;
  // manual ones (bookmark / URL paste / chat) skip it and land straight in
  // /contacts. Caller can override via explicit `user_action` in the body
  // (e.g. tests or admin flows).
  const userAction =
    explicitUserAction ??
    (source === "discovery" ? "pending" : null);

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
      current_title: current_title ?? null,
      company: company ?? null,
      location: location ?? null,
      avatar_url: avatar_url ?? null,
      source,
      notes: notes ?? null,
      status: "discovered",
      discovered_at: now,
      profile_snapshot: profile_snapshot ?? null,
      career_history: career_history ?? [],
      education: education ?? [],
      discovery_session_id: discovery_session_id ?? null,
      user_action: userAction,
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
  supabase: SupabaseServerClient
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
        current_title: contact.current_title,
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
      model_used: ModelTier.FAST,
    });
  } catch (err) {
    // Non-critical — log and swallow
    console.error("Async scoring failed for contact", contactId, err);
  }
}
