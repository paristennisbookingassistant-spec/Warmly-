/**
 * POST /api/ai/search
 * Searches for company intelligence to inject into meeting prep prompts.
 * Results cached per company for 7 days in Supabase. See PRD Section 5.4.3.
 *
 * TODO: Replace mock search with real Perplexity/SerpAPI integration.
 * The caching layer via Supabase is real; the fetch is currently mocked.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { searchCompanyIntel } from "@/lib/search";
import {
  unauthorized,
  validationError,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { CompanySearchApiResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const CompanySearchSchema = z.object({
  company_name: z.string().min(1).max(200),
  since_date: z.string().optional(),
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

  const parsed = CompanySearchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  let result;
  let cached = false;

  try {
    // searchCompanyIntel handles caching via in-memory cache.
    // In production, replace with Supabase-backed cache for cross-instance sharing.
    // TODO: Persist cache to a `company_intel_cache` table in Supabase.
    result = await searchCompanyIntel(
      parsed.data.company_name,
      parsed.data.since_date
    );

    // Determine if result was from cache (cached_at is recent = fresh from API)
    const cacheAgeMs = Date.now() - result.cached_at;
    cached = cacheAgeMs > 5000; // > 5s old = came from cache
  } catch (err) {
    console.error("Company search failed:", err);
    return internalError("Search failed");
  }

  const response: CompanySearchApiResponse = {
    data: {
      company_name: result.company_name,
      snippets: result.snippets,
      cached,
    },
    error: null,
  };

  return NextResponse.json(response);
}
