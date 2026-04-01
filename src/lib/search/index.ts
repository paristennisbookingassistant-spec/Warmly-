/**
 * search/index.ts
 * Web search for company intelligence used in meeting prep.
 * Results are injected into the LLM prompt — the LLM does NOT browse the web.
 * See PRD Section 5.4.3.
 *
 * Primary: Perplexity API (structured answers)
 * Fallback: SerpAPI / Exa (raw results)
 *
 * Search results are cached per company for 7 days.
 */

import type { CompanySearchResult } from "@/types/ai";

/** Cache duration: 7 days in milliseconds */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * In-memory cache for development. In production, replace with
 * Supabase KV or Redis to share cache across serverless instances.
 *
 * TODO: Replace with persistent cache before production deployment.
 */
const searchCache = new Map<string, CompanySearchResult>();

/**
 * Searches for recent company intelligence and caches the result.
 * Called by the meeting prep artifact generation flow.
 */
export async function searchCompanyIntel(
  companyName: string,
  sinceDate?: string
): Promise<CompanySearchResult> {
  const cacheKey = `${companyName}:${sinceDate ?? "recent"}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
    return cached;
  }

  // TODO: Implement actual search API call
  // Primary: Perplexity API
  // Fallback: SerpAPI or Exa
  const result = await fetchCompanyIntel(companyName, sinceDate);

  searchCache.set(cacheKey, result);
  return result;
}

/**
 * Performs the actual web search API call.
 * Currently a stub — replace with Perplexity/SerpAPI implementation.
 */
async function fetchCompanyIntel(
  companyName: string,
  sinceDate?: string
): Promise<CompanySearchResult> {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;

  if (!perplexityApiKey) {
    // Graceful fallback: return empty result if no API key configured
    return buildEmptyResult(companyName);
  }

  // TODO: Implement Perplexity API call
  // Query template: "{company_name} recent news funding leadership 2026"
  // POST https://api.perplexity.ai/chat/completions
  // Model: llama-3.1-sonar-small-128k-online (fast, web-enabled)
  const query = `${companyName} recent news funding leadership ${sinceDate ? `since ${sinceDate}` : "2026"}`;

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
            role: "user",
            content: query,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity search failed: ${response.status}`);
      return buildEmptyResult(companyName);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content ?? "";

    return {
      company_name: companyName,
      snippets: [{ title: `Company intelligence: ${companyName}`, body: content }],
      raw_context: content,
      cached_at: Date.now(),
    };
  } catch (err) {
    console.error("Company search error:", err);
    return buildEmptyResult(companyName);
  }
}

function buildEmptyResult(companyName: string): CompanySearchResult {
  return {
    company_name: companyName,
    snippets: [],
    raw_context: `No recent intelligence available for ${companyName}.`,
    cached_at: Date.now(),
  };
}
