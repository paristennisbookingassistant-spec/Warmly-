/**
 * POST /api/discovery/resolve-company
 *
 * Disambiguates a LinkedIn company search result. The hard case is companies
 * with very common names ("Wonderful" → 1,400 results, only one is the AI
 * agent startup). Search-and-pick-first-result is wrong; we let MiniMax do
 * the judgment with the user's intent as context.
 *
 * Two input modes (both supported for backwards compatibility):
 *
 *   NEW (preferred): structured candidates array + optional userContext.
 *     This is what the extension's smart resolution path sends — DOM-scraped
 *     rows with name/tagline/location/followers/slug. Highest signal.
 *
 *   LEGACY: a single searchResultsText blob. Less structured but the
 *     pre-existing extension path used it. Kept working so we don't break
 *     installed extensions during the rollout.
 *
 * Output:
 *   { data: {
 *       companyUrl: string | null,    // null if confidence too low
 *       companySlug: string | null,
 *       companyName: string | null,
 *       confidence: number,            // 0-1
 *       reasoning: string,
 *       candidates?: ResolvedCandidate[]   // surfaced when confidence is low
 *                                          // so the popup can show a picker
 *     } }
 *
 * Cache: resolved (companyName + userContext) pairs are written to
 * `company_slug_cache`. Subsequent identical queries skip the LLM call
 * entirely.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { callMiniMax } from "@/lib/ai/minimax";

// Confidence threshold below which we don't auto-navigate. The popup
// receives the candidates list and surfaces a picker.
const MIN_CONFIDENCE = 0.6;

// ---------------------------------------------------------------------------
// Input schemas — accept both new structured and legacy text formats
// ---------------------------------------------------------------------------

const CandidateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  /**
   * Raw row text scraped from LinkedIn search. Multi-line, semi-structured.
   * Higher signal than chasing CSS class names — the LLM parses it directly.
   */
  rawText: z.string().trim().max(800).optional().nullable(),
  // Legacy structured fields — accepted for backwards compat with older
  // extension builds. Newer builds send rawText instead.
  tagline: z.string().trim().max(500).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  followers: z.string().trim().max(100).optional().nullable(),
  url: z.string().trim().max(500).optional().nullable(),
});

const DownstreamFiltersSchema = z.object({
  schoolLabel: z.string().trim().max(200).optional(),
  locationLabel: z.string().trim().max(200).optional(),
  functionLabel: z.string().trim().max(200).optional(),
});

const InputSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  /**
   * Free-text user description that disambiguates the search. e.g.,
   * "the AI agent company" for Wonderful, or "the Paris VC fund" for
   * Iris Capital. Optional but high-signal when present.
   */
  userContext: z.string().trim().max(500).optional(),
  /**
   * Filters the user will apply AFTER picking the company. Passing these
   * lets the LLM reason "with Paris filter, the global parent is more
   * important than the regional sub-entity" — sharpens the parent-vs-
   * regional disambiguation. Human-readable labels (not geoUrns/IDs).
   */
  downstreamFilters: DownstreamFiltersSchema.optional(),
  /**
   * NEW path: DOM-scraped candidates from LinkedIn's company search.
   * If present, takes precedence over searchResultsText.
   */
  candidates: z.array(CandidateSchema).max(15).optional(),
  /**
   * LEGACY path: blob of search results text. Kept for backwards
   * compatibility with the existing extension build.
   */
  searchResultsText: z.string().trim().min(10).max(10_000).optional(),
  /**
   * Cache-write shortcut: when the user picks a candidate from the popup's
   * disambiguation UI (either after low-confidence or zero-results), the
   * service worker fires a forceSlug call to write the pick to the cache
   * without re-running the LLM. Next discovery for the same searchKey
   * hits the cache instantly.
   */
  forceSlug: z.string().trim().min(1).max(200).optional(),
  forceName: z.string().trim().max(200).optional(),
  forceReasoning: z.string().trim().max(500).optional(),
});

type Candidate = z.infer<typeof CandidateSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cache key — normalize so "Wonderful" / "wonderful" / " WONDERFUL " all hit
 * the same row. Include userContext because different contexts can resolve
 * to different companies.
 */
function buildSearchKey(companyName: string, userContext?: string): string {
  const name = companyName.toLowerCase().trim().replace(/\s+/g, " ");
  const ctx = (userContext ?? "").toLowerCase().trim().replace(/\s+/g, " ");
  return ctx ? `${name}|${ctx}` : name;
}

interface CachedResolution {
  resolved_slug: string;
  resolved_url: string;
  resolved_name: string | null;
  reasoning: string | null;
}

async function lookupCache(
  searchKey: string
): Promise<CachedResolution | null> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from("company_slug_cache")
      .select("resolved_slug, resolved_url, resolved_name, reasoning")
      .eq("search_key", searchKey)
      .maybeSingle();
    return (data as CachedResolution) ?? null;
  } catch {
    // Cache miss / table not present yet — non-fatal
    return null;
  }
}

async function writeCache(
  searchKey: string,
  resolved: { slug: string; url: string; name: string | null; reasoning: string | null }
): Promise<void> {
  try {
    // Use service-role client so the write bypasses RLS. The cache is global
    // (one row per company name + user context), shared across users — only
    // the service role should write to prevent cache poisoning.
    const admin = getSupabaseServiceClient();
    await admin.from("company_slug_cache").upsert(
      {
        search_key: searchKey,
        resolved_slug: resolved.slug,
        resolved_url: resolved.url,
        resolved_name: resolved.name,
        reasoning: resolved.reasoning,
      },
      { onConflict: "search_key" }
    );
  } catch (err) {
    // Non-fatal — log and continue
    console.warn("[resolve-company] cache write failed:", err);
  }
}

function buildPrompt(
  companyName: string,
  userContext: string | undefined,
  candidatesBlock: string,
  downstreamFilters?: z.infer<typeof DownstreamFiltersSchema>
): string {
  const filterLines: string[] = [];
  if (downstreamFilters?.schoolLabel) filterLines.push(`  - school: ${downstreamFilters.schoolLabel}`);
  if (downstreamFilters?.locationLabel) filterLines.push(`  - location: ${downstreamFilters.locationLabel}`);
  if (downstreamFilters?.functionLabel) filterLines.push(`  - function: ${downstreamFilters.functionLabel}`);
  const filtersBlock = filterLines.length > 0
    ? `Downstream filters that will be applied AFTER you pick:\n${filterLines.join("\n")}\n`
    : "";

  const ctxLine = userContext
    ? `User hint: "${userContext}".`
    : `No user hint provided.`;

  return `The user is searching for a LinkedIn company page to use as an ALUMNI SEARCH FILTER. After you pick, their search will filter the company's people by school and possibly location.

User input: "${companyName}"
${ctxLine}
${filtersBlock}
YOUR GOAL: Pick the LinkedIn company page whose ALUMNI POOL most likely contains people matching the user's downstream filters. This is NOT a "match the name" task — it's "pick the page that will return the right people".

DISAMBIGUATION RULES (in priority order):

1. BRAND FAMILIES. When you see multiple candidates that share a brand stem (e.g., "Bain & Company", "Bain & Company Brasil", "Bain & Company India", "Bain Belgium"), prefer the GLOBAL PARENT — typically the candidate whose name does NOT contain a country or region suffix. Regional sub-entities have SEGREGATED employee lists; the parent page contains all employees worldwide.

   Critical for alumni search: an INSEAD grad working at Bain's Paris office is listed under the parent "Bain & Company" — NOT under "Bain & Company Brasil" or any regional sub-page. If you pick a regional entity, the user's school + location filter will return zero results even if the brand has plenty of alumni globally.

   EXCEPTION: if the user's hint explicitly names a region ("Bain's Brazil practice", "the Mumbai office", "their São Paulo team"), the regional entity is correct.

2. USER HINT. Match the user's hint to each candidate's industry/description text in the rawText. e.g., hint "AI agent startup" → the candidate whose tagline mentions AI/agents. Hint "consulting company" generally points to a parent firm rather than a regional subsidiary.

3. FOLLOWER COUNT. Tie-breaker. The candidate with materially more followers (often 10-100x more) is usually the parent. e.g., "Bain & Company" with 4M followers vs. "Bain & Company Brasil" with 80K followers → the parent.

Candidates (numbered, with slug + raw row text from LinkedIn search):
${candidatesBlock}

Respond with ONLY a JSON object — no preamble, no commentary, no code fences:

{
  "slug": string | null,        // LinkedIn company slug (e.g. "bain-and-company")
  "url": string | null,          // Full URL, e.g. "https://www.linkedin.com/company/bain-and-company/"
  "name": string | null,         // Company name as shown in the candidate
  "confidence": number,          // 0.0 to 1.0
  "reasoning": string            // ONE sentence. Cite the specific signal you used (parent vs regional, hint match, follower count).
}

If NO candidate is clearly right: slug=null, url=null, name=null, confidence=0, reasoning="No clear match — surface picker".

CONFIDENCE CALIBRATION:
- 0.9-1.0: clear winner — parent (or unambiguous brand) + hint match + dominant follower count
- 0.7-0.9: strong pick with minor ambiguity (parent absent, picked best regional)
- 0.5-0.7: multiple plausible candidates, picked best
- < 0.5: real ambiguity — return null and let user pick`;
}

function structuredCandidatesBlock(candidates: Candidate[]): string {
  return candidates
    .map((c, i) => {
      const header = `=== ${i + 1}. slug=${c.slug} ===`;
      // Prefer rawText (newer extension build); fall back to legacy
      // structured fields for backwards compatibility.
      if (c.rawText && c.rawText.trim().length > 0) {
        return `${header}\n${c.rawText.trim()}`;
      }
      const lines: string[] = [c.name];
      if (c.tagline) lines.push(c.tagline);
      if (c.location) lines.push(c.location);
      if (c.followers) lines.push(c.followers);
      return `${header}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      companyName,
      userContext,
      downstreamFilters,
      candidates,
      searchResultsText,
      forceSlug,
      forceName,
      forceReasoning,
    } = parsed.data;

    // ---- Cache-write shortcut: user picked from the popup's disambiguation UI ----
    // No LLM call, no cache lookup — the user's pick IS the ground truth.
    // Writes to `company_slug_cache` so next discovery for the same searchKey
    // hits the cache instantly.
    if (forceSlug) {
      const searchKey = buildSearchKey(companyName, userContext);
      await writeCache(searchKey, {
        slug: forceSlug,
        url: `https://www.linkedin.com/company/${forceSlug}/`,
        name: forceName ?? null,
        reasoning: forceReasoning ?? "User-corrected pick",
      });
      return NextResponse.json({
        data: {
          companyUrl: `https://www.linkedin.com/company/${forceSlug}/`,
          companySlug: forceSlug,
          companyName: forceName ?? null,
          confidence: 1.0,
          reasoning: forceReasoning ?? "User-corrected pick",
          fromCache: false,
          written: true,
        },
      });
    }

    if (!candidates && !searchResultsText) {
      return NextResponse.json(
        {
          error: {
            message:
              "Provide either `candidates` (preferred) or `searchResultsText`",
          },
        },
        { status: 400 }
      );
    }

    // ---- Cache lookup ----
    const searchKey = buildSearchKey(companyName, userContext);
    const cached = await lookupCache(searchKey);
    if (cached) {
      return NextResponse.json({
        data: {
          companyUrl: cached.resolved_url,
          companySlug: cached.resolved_slug,
          companyName: cached.resolved_name,
          confidence: 1.0, // cached → trusted
          reasoning: cached.reasoning ?? "Resolved previously",
          fromCache: true,
        },
      });
    }

    // ---- Build the LLM prompt ----
    const candidatesBlock = candidates
      ? structuredCandidatesBlock(candidates)
      : `(legacy raw text format)\n${searchResultsText}`;
    const prompt = buildPrompt(companyName, userContext, candidatesBlock, downstreamFilters);

    // ---- Call MiniMax ----
    let response;
    try {
      response = await callMiniMax([{ role: "user", content: prompt }], {
        // 1000 leaves room for a {slug, url, name, confidence, reasoning}
        // object plus any preamble the model writes before the JSON. The
        // previous 400 was getting truncated mid-stream, producing
        // "Could not parse LLM response".
        maxTokens: 1000,
        temperature: 0.1,
      });
    } catch (err) {
      console.error("[resolve-company] MiniMax error:", err);
      return NextResponse.json(
        {
          error: {
            message: `MiniMax error: ${err instanceof Error ? err.message : "unknown"}`,
          },
        },
        { status: 500 }
      );
    }

    const rawText = response.content;
    // Strip ```json``` code fences if the model wraps the output in them
    // despite the prompt telling it not to.
    const fenced = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const candidate = fenced ? fenced[1] : rawText;
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[resolve-company] Non-JSON LLM response. Raw output (first 800 chars):",
        rawText.slice(0, 800)
      );
      return NextResponse.json({
        data: {
          companyUrl: null,
          companySlug: null,
          companyName: null,
          confidence: 0,
          reasoning: "Could not parse LLM response",
          candidates: candidates ?? [],
        },
      });
    }

    let llmResult: {
      slug: string | null;
      url: string | null;
      name: string | null;
      confidence: number;
      reasoning: string;
    };
    try {
      llmResult = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error(
        "[resolve-company] JSON parse error:",
        err instanceof Error ? err.message : err,
        "\nMatched chunk (first 500 chars):",
        jsonMatch[0].slice(0, 500),
        "\nRaw output (first 800 chars):",
        rawText.slice(0, 800)
      );
      return NextResponse.json({
        data: {
          companyUrl: null,
          companySlug: null,
          companyName: null,
          confidence: 0,
          reasoning: "Malformed LLM JSON",
          candidates: candidates ?? [],
        },
      });
    }

    // Synthesize URL from slug if LLM gave one without the full URL
    let finalUrl = llmResult.url;
    if (!finalUrl && llmResult.slug) {
      finalUrl = `https://www.linkedin.com/company/${llmResult.slug}/`;
    }

    const confidence = Math.max(0, Math.min(1, Number(llmResult.confidence) || 0));

    // Low confidence → tell caller to surface picker. Don't cache low-confidence
    // results because the right answer is "ask the user".
    if (confidence < MIN_CONFIDENCE || !finalUrl || !llmResult.slug) {
      return NextResponse.json({
        data: {
          companyUrl: null,
          companySlug: null,
          companyName: llmResult.name,
          confidence,
          reasoning:
            llmResult.reasoning ?? "Confidence too low to auto-select",
          candidates: candidates ?? [],
        },
      });
    }

    // High confidence → cache + return
    await writeCache(searchKey, {
      slug: llmResult.slug,
      url: finalUrl,
      name: llmResult.name,
      reasoning: llmResult.reasoning,
    });

    return NextResponse.json({
      data: {
        companyUrl: finalUrl,
        companySlug: llmResult.slug,
        companyName: llmResult.name,
        confidence,
        reasoning: llmResult.reasoning,
        fromCache: false,
      },
    });
  } catch (err) {
    console.error("[resolve-company] Unhandled error:", err);
    return NextResponse.json(
      { error: { message: "Failed to resolve company" } },
      { status: 500 }
    );
  }
}
