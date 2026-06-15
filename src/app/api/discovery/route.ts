/**
 * GET  /api/discovery  — List discovery sessions
 * POST /api/discovery  — Start a new discovery session
 *
 * Rate limits enforced server-side AND in the extension service worker.
 * Hard limits: max 25 profiles/session, max 2 sessions/day, min 2h cooldown.
 * See PRD DIS-08.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  internalError,
  rateLimitError,
  buildPaginatedResponse,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  ListDiscoverySessionsResponse,
  StartDiscoveryResponse,
} from "@/types/api";
import type { DiscoverySession } from "@/types/database";

// ---------------------------------------------------------------------------
// Rate limit constants (mirrored in extension/service-worker/rate-limiter.ts)
// ---------------------------------------------------------------------------

export const MAX_PROFILES_PER_SESSION = 25;
export const MAX_SESSIONS_PER_DAY = 2;
/** Minimum milliseconds between sessions: 2 hours */
export const MIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ListDiscoveryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.string().optional(),
});

const StartDiscoverySchema = z.object({
  /**
   * FK to Conversations.id. Optional for company discovery triggered from the
   * Discover screen (outside a chat context). When omitted, the session is
   * created without a conversation link and `conversation_id` is null in the DB.
   */
  conversation_id: z.string().uuid().nullish(),
  target_companies: z
    .array(z.string().min(1).max(200))
    .min(1)
    .max(10),
  /**
   * Free-form hint for company disambiguation — forwarded to the extension's
   * CDP_DISCOVER path via WEBAPP_DISCOVER. Not stored on the session row itself
   * but passed back in the response so the frontend can include it in the
   * postMessage payload.
   */
  company_hint: z.string().max(500).optional(),
  /** INSEAD school filter label — default "INSEAD". Passed to CDP_DISCOVER. */
  school_label: z.string().max(200).optional().default("INSEAD"),
  /** Location filter label (e.g. "Paris", "London"). Passed to CDP_DISCOVER. */
  location_label: z.string().max(200).optional(),
  /** LinkedIn function filter label (e.g. "Finance", "Consulting"). Passed to CDP_DISCOVER. */
  function_label: z.string().max(200).optional(),
  max_profiles: z
    .number()
    .int()
    .min(1)
    .max(MAX_PROFILES_PER_SESSION)
    .optional()
    .default(MAX_PROFILES_PER_SESSION),
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

  const parsed = ListDiscoveryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { page, per_page, status } = parsed.data;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = supabase
    .from("discovery_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (status) query = query.eq("status", status);

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("discovery GET error:", error);
    return internalError("Failed to fetch discovery sessions");
  }

  const response: ListDiscoverySessionsResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as DiscoverySession[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: body, error: parseErr } = await parseJsonBody(request);
    if (parseErr) return parseErr;

    const parsed = StartDiscoverySchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        "Invalid request body",
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Verify the conversation belongs to this user (only when conversation_id provided)
    if (parsed.data.conversation_id) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", parsed.data.conversation_id)
        .eq("user_id", user.id)
        .single();

      if (!conversation) {
        return validationError("conversation_id does not exist or does not belong to you");
      }
    }

    // Rate limit check 1: max 2 sessions per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("discovery_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", todayStart.toISOString());

    if ((todayCount ?? 0) >= MAX_SESSIONS_PER_DAY) {
      return rateLimitError(
        `You have reached the maximum of ${MAX_SESSIONS_PER_DAY} discovery sessions per day. Try again tomorrow.`
      );
    }

    // Rate limit check 2: min 2h cooldown since last session
    const { data: lastSession } = await supabase
      .from("discovery_sessions")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSession) {
      const lastSessionTime = new Date(lastSession.started_at as string).getTime();
      const elapsed = Date.now() - lastSessionTime;
      if (elapsed < MIN_COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((MIN_COOLDOWN_MS - elapsed) / 60000);
        return rateLimitError(
          `Please wait ${remainingMinutes} more minutes before starting another discovery session.`
        );
      }
    }

    // Create the discovery session
    const maxProfiles = parsed.data.max_profiles;
    const perCompany = Math.max(1, Math.floor(maxProfiles / parsed.data.target_companies.length));
    const { company_hint, school_label, location_label, function_label } = parsed.data;

    const { data: newSession, error: insertError } = await supabase
      .from("discovery_sessions")
      .insert({
        user_id: user.id,
        conversation_id: parsed.data.conversation_id ?? null,
        target_companies: parsed.data.target_companies,
        search_strategy: {
          companies: parsed.data.target_companies,
          target_roles: ["Associate", "Senior Associate", "VP", "Manager", "Director"],
          target_seniority: ["mid", "senior"],
          keywords: ["MBA", "consulting", "private equity", "venture capital"],
          max_profiles_per_company: perCompany,
          rationale: `Targeting ${parsed.data.target_companies.join(", ")} — up to ${perCompany} profiles per company`,
          // Company discovery criteria — forwarded to CDP_DISCOVER via WEBAPP_DISCOVER
          company_hint: company_hint ?? null,
          school_label: school_label ?? "INSEAD",
          location_label: location_label ?? null,
          function_label: function_label ?? null,
        },
        profiles_viewed: 0,
        profiles_scored: 0,
        profiles_saved: 0,
        status: "running",
        rate_limit_remaining: maxProfiles,
      })
      .select()
      .single();

    if (insertError || !newSession) {
      console.error("discovery POST error:", insertError);
      return internalError("Failed to create discovery session");
    }

    const response: StartDiscoveryResponse = {
      data: newSession as DiscoverySession,
      error: null,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("discovery POST unhandled error:", err);
    return internalError("Failed to create discovery session");
  }
}
