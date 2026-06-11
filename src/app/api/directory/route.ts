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
 *   company      – ilike match on company
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

  let query = supabase
    .from("directory_profiles")
    .select("*", { count: "exact" });

  // Exact-match filters
  if (cohort) query = query.eq("cohort", cohort);

  // ilike filters
  if (company) query = query.ilike("company", `%${company}%`);

  // Array-overlap filters. `industry`/`function`/`geo` accept a comma-separated
  // list of canonical values (e.g. "Venture Capital,Private Equity"); a row
  // matches if ANY of its array elements overlap. Values must match the stored
  // casing — the client maps keywords → canonical DB strings before calling.
  const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  if (industry) query = query.overlaps("industries", csv(industry));
  if (fn) query = query.overlaps("functions", csv(fn));
  if (geo) query = query.overlaps("geography", csv(geo));

  // Free-text search across name, company, current_title, AND location — so
  // city/geo terms (e.g. "Paris") match the free-text location field (the
  // `geography` array is country-level and won't contain cities).
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,current_title.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  // Sorting
  const ascending = sort_order === "asc";
  query = query
    .order(sort_by, { ascending, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

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
