/**
 * GET /api/directory
 *
 * Returns a paginated, filtered list of shared INSEAD directory profiles.
 * RLS on directory_profiles allows any authenticated user to read all rows —
 * the server client handles auth via the session cookie.
 *
 * Query params (all optional):
 *   page         – page number (default 1)
 *   per_page     – results per page (default 24, max 100)
 *   cohort       – exact match on cohort (e.g. "mba26d")
 *   company      – matches CURRENT company (column) OR a PAST employer in the
 *                  career-history experience JSONB (case-insensitive substring)
 *   industry     – array-contains on industries (e.g. "Consulting")
 *   function     – array-contains on functions
 *   geo          – array-contains on geography
 *   search       – ilike on name, company, current_title
 *   sort_by      – "name" | "cohort" (default "name")
 *   sort_order   – "asc" | "desc" (default "asc")
 *
 * Response: { data: { items, total, page, per_page, has_more }, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  validationError,
  internalError,
  buildPaginatedResponse,
} from "@/lib/api/helpers";
import type { ListDirectoryResponse } from "@/types/directory";
import type { DirectoryProfile } from "@/types/directory";
import type { LinkedInExperienceEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const ListDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(24),
  cohort: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  function: z.string().optional(),
  geo: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.enum(["name", "cohort"]).optional().default("name"),
  sort_order: z.enum(["asc", "desc"]).optional().default("asc"),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = ListDirectoryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const {
    page,
    per_page,
    cohort,
    company,
    industry,
    function: fn,
    geo,
    search,
    sort_by,
    sort_order,
  } = parsed.data;

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  const ascending = sort_order === "asc";
  const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  // ---------------------------------------------------------------------------
  // Company filter — match CURRENT company (column) OR a PAST employer in the
  // career history (experience JSONB). PostgREST can't do a case-insensitive
  // substring match inside a JSONB array of objects, so when a company term is
  // present we broaden the DB query (all OTHER filters still applied at the DB),
  // fetch a capped candidate set, then match current-or-past company in JS and
  // paginate the filtered result. The directory is ~1k rows, so a single capped
  // fetch is cheap and avoids a second round trip per page.
  // ---------------------------------------------------------------------------
  if (company) {
    const needle = company.trim().toLowerCase();

    // Broadened query: every filter EXCEPT company, capped + ordered, then
    // matched current-or-past in JS. SCAN_CAP comfortably exceeds the directory.
    const SCAN_CAP = 2000;
    let scanQuery = supabase.from("directory_profiles").select("*");
    if (cohort) scanQuery = scanQuery.eq("cohort", cohort);
    if (industry) scanQuery = scanQuery.overlaps("industries", csv(industry));
    if (fn) scanQuery = scanQuery.overlaps("functions", csv(fn));
    if (geo) scanQuery = scanQuery.overlaps("geography", csv(geo));
    if (search) {
      scanQuery = scanQuery.or(
        `name.ilike.%${search}%,company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%`
      );
    }
    scanQuery = scanQuery
      .order(sort_by, { ascending, nullsFirst: false })
      .limit(SCAN_CAP);

    const { data: scanned, error: scanErr } = await scanQuery;
    if (scanErr) {
      console.error("directory GET (company) error:", scanErr);
      return internalError("Failed to fetch directory profiles");
    }

    const matchesCompany = (p: DirectoryProfile): boolean => {
      if (p.company && p.company.toLowerCase().includes(needle)) return true;
      const exp = (p.experience ?? []) as LinkedInExperienceEntry[];
      return exp.some((e) => e.company?.toLowerCase().includes(needle));
    };

    const filtered = ((scanned ?? []) as DirectoryProfile[]).filter(matchesCompany);
    const pageItems = filtered.slice(from, from + per_page);

    const response: ListDirectoryResponse = {
      data: buildPaginatedResponse(pageItems, filtered.length, page, per_page),
      error: null,
    };
    return NextResponse.json(response);
  }

  // ---------------------------------------------------------------------------
  // Default path — DB-side pagination (no company filter).
  // ---------------------------------------------------------------------------
  let query = supabase
    .from("directory_profiles")
    .select("*", { count: "exact" });

  if (cohort) query = query.eq("cohort", cohort);
  if (industry) query = query.overlaps("industries", csv(industry));
  if (fn) query = query.overlaps("functions", csv(fn));
  if (geo) query = query.overlaps("geography", csv(geo));
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query
    .order(sort_by, { ascending, nullsFirst: false })
    .range(from, to);

  if (error) {
    console.error("directory GET error:", error);
    return internalError("Failed to fetch directory profiles");
  }

  const response: ListDirectoryResponse = {
    data: buildPaginatedResponse(
      (data ?? []) as DirectoryProfile[],
      count ?? 0,
      page,
      per_page
    ),
    error: null,
  };

  return NextResponse.json(response);
}
