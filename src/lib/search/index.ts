/**
 * search/index.ts
 * Web search for company intelligence used in meeting prep.
 * Results are injected into the LLM prompt — the LLM does NOT browse the web.
 * See PRD Section 5.4.3.
 *
 * Primary: Perplexity API (structured answers with web access)
 * Fallback: empty result with graceful degradation
 *
 * Search results are cached per company for 7 days (in-memory for MVP).
 * TODO: Replace in-memory cache with Supabase table before multi-instance deploy.
 */

import type { CompanySearchResult } from "@/types/ai";

/** Cache duration: 7 days in milliseconds */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * In-memory cache for development/single-instance deploy.
 * In production on Vercel (serverless), each invocation gets a fresh module,
 * so this cache is effectively per-request unless Next.js reuses the instance.
 * TODO: Replace with Supabase `company_intel_cache` table for shared caching.
 */
const searchCache = new Map<string, CompanySearchResult>();

/**
 * Returns company intelligence for a given company name.
 * Checks in-memory cache first (7-day TTL), then fetches via Perplexity API.
 */
export async function searchCompanyIntel(
  companyName: string,
  sinceDate?: string
): Promise<CompanySearchResult> {
  const cacheKey = `${companyName.toLowerCase()}:${sinceDate ?? "recent"}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
    return cached;
  }

  const result = await fetchCompanyIntel(companyName, sinceDate);
  searchCache.set(cacheKey, result);
  return result;
}

/**
 * Clears the in-memory cache entry for a given company.
 * Used for testing and cache invalidation.
 */
export function invalidateCompanyCache(companyName: string): void {
  for (const key of searchCache.keys()) {
    if (key.startsWith(companyName.toLowerCase())) {
      searchCache.delete(key);
    }
  }
}

/**
 * Performs the actual web search API call via Perplexity.
 * Falls back to an empty result if PERPLEXITY_API_KEY is not set.
 */
async function fetchCompanyIntel(
  companyName: string,
  sinceDate?: string
): Promise<CompanySearchResult> {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

  if (!perplexityApiKey) {
    // Graceful fallback: return empty result if no API key configured
    // TODO: Connect real Perplexity/SerpAPI key when available
    return buildEmptyResult(companyName);
  }

  const year = new Date().getFullYear();
  const query = `${companyName} recent news funding leadership strategy ${sinceDate ? `since ${sinceDate}` : year}`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Provide a concise summary of recent company news, funding, leadership changes, and strategic priorities. Be factual and cite dates when available.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn(`Perplexity search returned ${response.status} for "${companyName}"`);
      return buildEmptyResult(companyName);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content ?? "";

    const result: CompanySearchResult = {
      company_name: companyName,
      snippets: [
        {
          title: `Recent intelligence: ${companyName}`,
          body: content,
          published_date: new Date().toISOString().split("T")[0],
        },
      ],
      raw_context: content,
      cached_at: Date.now(),
    };

    return result;
  } catch (err) {
    console.error(`Company search error for "${companyName}":`, err);
    return buildEmptyResult(companyName);
  }
}

function buildEmptyResult(companyName: string): CompanySearchResult {
  return {
    company_name: companyName,
    snippets: [],
    raw_context: `No recent intelligence available for ${companyName}. Focus on the contact's profile and career context.`,
    cached_at: Date.now(),
  };
}
