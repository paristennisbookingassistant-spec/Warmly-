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
  tagline: z.string().trim().max(500).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  followers: z.string().trim().max(100).optional().nullable(),
  slug: z.string().trim().min(1).max(200),
  url: z.string().trim().max(500).optional().nullable(),
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
   * NEW path: DOM-scraped candidates from LinkedIn's company search.
   * If present, takes precedence over searchResultsText.
   */
  candidates: z.array(CandidateSchema).max(15).optional(),
  /**
   * LEGACY path: blob of search results text. Kept for backwards
   * compatibility with the existing extension build.
   */
  searchResultsText: z.string().trim().min(10).max(10_000).optional(),
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
  candidatesBlock: string
): string {
  const ctxLine = userContext
    ? `User added context: "${userContext}". Use this to disambiguate.`
    : `No extra user context provided — pick the most likely match for "${companyName}".`;

  return `The user wants to find the LinkedIn page for the company "${companyName}".

${ctxLine}

Below are candidate companies returned by LinkedIn search. Pick the BEST match. Return ONLY a JSON object:

{
  "slug": string | null,        // LinkedIn company slug (the "wonderfulcx" part of "linkedin.com/company/wonderfulcx/")
  "url": string | null,          // Full company URL, e.g. "https://www.linkedin.com/company/wonderfulcx/"
  "name": string | null,         // Company name as shown in candidate
  "confidence": number,          // 0.0 to 1.0
  "reasoning": string            // ONE sentence explaining your pick. Specific. Cite the signal you used (tagline, location, follower count, exact name match, etc.)
}

If NO candidate clearly matches, return slug=null url=null name=null confidence=0 reasoning="No clear match in results — recommend asking the user".

Confidence calibration:
- 0.9-1.0: exact name match + supporting signals (tagline, user-context hint)
- 0.7-0.9: strong match but some ambiguity (e.g., name matches but tagline isn't clear evidence)
- 0.5-0.7: best of several plausible options
- < 0.5: no good match — return null

Candidates:
${candidatesBlock}`;
}

function structuredCandidatesBlock(candidates: Candidate[]): string {
  return candidates
    .map((c, i) => {
      const parts = [`${i + 1}. ${c.name} (slug: ${c.slug})`];
      if (c.tagline) parts.push(`   Tagline: ${c.tagline}`);
      if (c.location) parts.push(`   Location: ${c.location}`);
      if (c.followers) parts.push(`   ${c.followers}`);
      return parts.join("\n");
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

    const { companyName, userContext, candidates, searchResultsText } = parsed.data;

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
    const prompt = buildPrompt(companyName, userContext, candidatesBlock);

    // ---- Call MiniMax ----
    let response;
    try {
      response = await callMiniMax([{ role: "user", content: prompt }], {
        maxTokens: 400,
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

    const text = response.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[resolve-company] Non-JSON LLM response:",
        text.slice(0, 500)
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
        err,
        jsonMatch[0].slice(0, 300)
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
