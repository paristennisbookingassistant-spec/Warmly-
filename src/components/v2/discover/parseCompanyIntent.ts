/**
 * components/v2/discover/parseCompanyIntent.ts
 *
 * Pure heuristic intent detector: decides whether a refine-chat message is
 * asking to FIND NEW PEOPLE at a specific company, rather than re-filtering
 * the existing deck. No LLM involved — conservative regex only.
 *
 * Returns { company, location? } on a clear match, null otherwise.
 */

export interface CompanyIntentResult {
  company: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Trailing "in <City>" suffix after a matched company name.
const LOCATION_SUFFIX_RE = /\bin\s+([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+){0,2})/i;

// Greedy company-name token (1–5 title-case words, may contain & / -).
const COMPANY_TOKEN_RE =
  /([A-Z0-9][A-Za-z0-9&.,'/\-]*(?:\s+[A-Z0-9][A-Za-z0-9&.,'/\-]*){0,4})/;

// Strip common trailing prepositions that bleed into the match.
const STRIP_TRAILING_RE =
  /\s+(in|at|for|of|the|and|or|a|an|to|with|from|is|are)\s*$/i;

function cleanCompany(raw: string): string {
  return raw.replace(STRIP_TRAILING_RE, "").trim();
}

function extractLocation(tail: string): string | undefined {
  const m = tail.match(LOCATION_SUFFIX_RE);
  return m ? m[1].trim() : undefined;
}

// Generic filter words that look like company names but aren't.
const FILTER_KEYWORDS = new Set([
  "consulting", "vc", "paris", "berlin", "london", "singapore", "me", "us",
  "them", "tech", "startups", "finance", "banking", "healthcare", "investing",
  "venture", "capital", "product", "pm", "roles", "profiles", "alumni",
  "people", "contacts", "connections", "network", "insead", "mba",
  "cohort", "december", "july",
]);

function isFilterWord(s: string): boolean {
  return FILTER_KEYWORDS.has(s.toLowerCase());
}

// ---------------------------------------------------------------------------
// Pattern lists
// ---------------------------------------------------------------------------

// PREFIX patterns: match the lead-in phrase; company is what follows.
// e.g. "find people at McKinsey", "anyone working at Bain & Company in Paris"
const PREFIX_PATTERNS: RegExp[] = [
  /(?:find|show(?:\s+me)?|get|search(?:\s+for)?|look(?:\s+for)?|discover)\s+(?:people|someone|anyone|contacts?|connections?|alumni|colleagues?|professionals?)(?:\s+(?:working|based|located))?\s+(?:at|from|in)\s+/i,
  /(?:people|someone|anyone|contacts?|connections?|alumni|colleagues?|professionals?)\s+(?:working\s+)?(?:at|from|in)\s+/i,
];

// SUFFIX keyword: company name comes BEFORE "employees" / "alumni" etc.
// e.g. "Bain alumni", "McKinsey employees"
const SUFFIX_KEYWORD_RE = /\b(employees|alumni|people|staff|team)\b/i;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseCompanyIntent(message: string): CompanyIntentResult | null {
  const trimmed = message.trim();

  // --- PREFIX patterns ---
  for (const re of PREFIX_PATTERNS) {
    const m = trimmed.match(re);
    if (!m) continue;

    const afterPrefix = trimmed.slice(m.index! + m[0].length);
    const compMatch = afterPrefix.match(COMPANY_TOKEN_RE);
    if (!compMatch) continue;

    const company = cleanCompany(compMatch[1]);
    if (!company || company.length < 2 || isFilterWord(company)) continue;

    const afterCompany = afterPrefix.slice(compMatch.index! + compMatch[1].length);
    return { company, location: extractLocation(afterCompany) };
  }

  // --- SUFFIX pattern: "<Company> employees/alumni" ---
  const kwMatch = trimmed.match(SUFFIX_KEYWORD_RE);
  if (kwMatch && kwMatch.index !== undefined) {
    const beforeKw = trimmed.slice(0, kwMatch.index).trim();
    const companyRe =
      /([A-Z][A-Za-z0-9&.,'/\-]*(?:\s+[A-Z0-9][A-Za-z0-9&.,'/\-]*){0,4})\s*$/;
    const compMatch = beforeKw.match(companyRe);
    if (compMatch) {
      const company = cleanCompany(compMatch[1]);
      if (company.length >= 2 && !isFilterWord(company)) {
        const afterKw = trimmed.slice(kwMatch.index + kwMatch[0].length);
        return { company, location: extractLocation(afterKw) };
      }
    }
  }

  return null;
}
