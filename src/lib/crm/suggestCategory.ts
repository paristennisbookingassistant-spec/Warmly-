/**
 * suggestCategory.ts
 * Pure heuristic that infers the most appropriate RelationshipCategory for an
 * uncategorized contact. Zero I/O, zero LLM calls — instant + free.
 *
 * Priority order (first match wins):
 *  1. inner_circle — INSEAD network tie (education_v2, education, current_title,
 *                    company) OR source === "cv_book"
 *  2. keep_warm    — senior title keyword match on current_title
 *  3. nurturing    — default for any contact with usable fields
 *  null            — no usable fields (completely empty contact)
 */

import type { Contact, RelationshipCategory } from "@/types/database";

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const INSEAD_RE = /insead/i;

/**
 * Titles that merit a keep_warm cadence.
 * Covers: Partner, Director, VP, Vice President, Head of, Chief *, CEO/CFO/COO/CTO/CSO,
 * Founder, Managing (Director/Partner), Principal, Professor, MD.
 */
const SENIOR_TITLE_RE =
  /partner|director|vp\b|vice[\s-]president|head\s+of|chief|c[eosft]o\b|founder|managing|principal|professor|md\b/i;

// ---------------------------------------------------------------------------
// Helper — check for INSEAD in all relevant profile fields
// ---------------------------------------------------------------------------

function hasInseadSignal(contact: Contact): boolean {
  // education_v2 (LinkedIn enrichment — most reliable)
  if (contact.education_v2) {
    for (const e of contact.education_v2) {
      if (INSEAD_RE.test(e.school)) return true;
    }
  }

  // education (structured entries from onboarding or extension)
  if (contact.education) {
    for (const e of contact.education) {
      if (INSEAD_RE.test(e.school)) return true;
    }
  }

  // current_title or company as a last-resort text probe
  if (contact.current_title && INSEAD_RE.test(contact.current_title)) return true;
  if (contact.company && INSEAD_RE.test(contact.company)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CategorySuggestion {
  category: RelationshipCategory;
  reason: string;
}

/**
 * Returns a category suggestion for an uncategorized contact, or null if
 * the contact has no usable fields to heuristic against.
 *
 * Call only when contact.relationship_category === null.
 */
export function suggestCategory(contact: Contact): CategorySuggestion | null {
  // Rule 1 — inner_circle: INSEAD alumni or CV book source
  if (contact.source === "cv_book" || hasInseadSignal(contact)) {
    return {
      category: "inner_circle",
      reason: "Fellow INSEAD — a close-network tie.",
    };
  }

  // Rule 2 — keep_warm: senior title detected
  if (contact.current_title && SENIOR_TITLE_RE.test(contact.current_title)) {
    // Extract the matched word for a friendlier reason string.
    const match = contact.current_title.match(SENIOR_TITLE_RE);
    const titleWord = match ? match[0] : contact.current_title;
    const capitalized = titleWord.charAt(0).toUpperCase() + titleWord.slice(1).toLowerCase();
    return {
      category: "keep_warm",
      reason: `Senior ${capitalized} — worth keeping warm.`,
    };
  }

  // Rule 3 — nurturing: default for any contact we have enough data for
  if (contact.name || contact.current_title || contact.company) {
    return {
      category: "nurturing",
      reason: "New connection — nurture the momentum.",
    };
  }

  // No usable data
  return null;
}
