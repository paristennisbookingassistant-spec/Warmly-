/**
 * matchSignals.ts
 *
 * Derive 4 short "Why this match" bullets for a contact from their existing
 * fields — no LLM call required. Used in ContactDetail's right-sidebar.
 *
 * Ported from docs/design/v2/project/src/detail.jsx (buildMatchSignals).
 *
 * The signals are heuristics over career history, education, status, and
 * location. We try to surface the most concrete shared context first
 * (school overlap, prior employer overlap) and fall back to softer
 * signals (relationship stage, geography).
 */

import type { Contact, User } from "@/types/database";

interface MatchSignalsInput {
  contact: Contact;
  /** The current user. Optional — without it, we skip overlap signals. */
  user?: Pick<User, "career_history" | "education"> | null;
}

const TARGET_SECTORS = [
  "VC",
  "PE",
  "Private Equity",
  "Venture",
  "Fintech",
  "SaaS",
  "Consumer",
  "Deep tech",
  "Growth",
  "AI",
  "Healthcare",
  "Pharma",
];

const CONSULTING_FIRMS = ["Bain", "McKinsey", "BCG", "Deloitte", "Accenture"];

function findOverlap<T>(
  a: T[],
  b: T[],
  key: (item: T) => string
): { match: string } | null {
  const seen = new Set(a.map((item) => key(item).toLowerCase()).filter(Boolean));
  for (const item of b) {
    const k = key(item).toLowerCase();
    if (k && seen.has(k)) {
      return { match: key(item) };
    }
  }
  return null;
}

function listIncludes(haystack: string[], needles: string[]): string[] {
  const lower = haystack.map((h) => h.toLowerCase());
  return needles.filter((n) =>
    lower.some((h) => h.includes(n.toLowerCase()))
  );
}

export function buildMatchSignals({
  contact,
  user,
}: MatchSignalsInput): string[] {
  const signals: string[] = [];

  // ---- Strongest: school overlap with the user
  if (user?.education && user.education.length > 0) {
    const overlap = findOverlap(
      user.education,
      contact.education,
      (e) => e.school
    );
    if (overlap) {
      signals.push(`Shared alma mater — ${overlap.match}`);
    }
  }

  // ---- Strong: company overlap (current or past employer)
  if (user?.career_history && user.career_history.length > 0) {
    const overlap = findOverlap(
      user.career_history,
      contact.career_history,
      (r) => r.company
    );
    if (overlap) {
      signals.push(`Shared employer history — ${overlap.match}`);
    }
  }

  // ---- Domain match: contact in user's target sectors (from current title or recent companies)
  const contactCompanies = [
    contact.company ?? "",
    ...contact.career_history.slice(0, 3).map((r) => r.company),
  ].filter(Boolean);
  const matchingSectors = listIncludes(contactCompanies, TARGET_SECTORS);
  if (matchingSectors.length > 0) {
    signals.push(`Active in your target space (${matchingSectors[0]})`);
  }

  // ---- Career path: consulting → investing pivot signal
  const userIsConsultant =
    user?.career_history?.some((r) =>
      CONSULTING_FIRMS.some((f) =>
        r.company.toLowerCase().includes(f.toLowerCase())
      )
    ) ?? false;
  const contactWasConsultant = contact.career_history.some((r) =>
    CONSULTING_FIRMS.some((f) =>
      r.company.toLowerCase().includes(f.toLowerCase())
    )
  );
  const contactNowInvestor =
    matchingSectors.includes("VC") ||
    matchingSectors.includes("PE") ||
    matchingSectors.includes("Private Equity") ||
    matchingSectors.includes("Venture");
  if (userIsConsultant && contactWasConsultant && contactNowInvestor) {
    signals.push("Same consulting → investing pivot you're targeting");
  }

  // ---- Stage-based signals (always relevant)
  if (contact.status === "ongoing" || contact.status === "met") {
    if (contact.last_interaction_at) {
      const days = Math.floor(
        (Date.now() - new Date(contact.last_interaction_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (days <= 30) {
        signals.push("Relationship is warm — recent contact");
      } else if (days >= 90) {
        signals.push(`Relationship cooling — last touch ${days} days ago`);
      } else {
        signals.push(`Active relationship — ${days}d since last contact`);
      }
    } else {
      signals.push("Established relationship");
    }
  } else if (contact.status === "discovered") {
    signals.push("Not yet contacted — cold outreach opportunity");
  } else if (contact.status === "contacted") {
    signals.push("Outreach sent — awaiting reply");
  }

  // ---- Location (always last, only if we have room)
  if (signals.length < 4 && contact.location) {
    signals.push(`Based in ${contact.location}`);
  }

  // ---- Fallback: surface scoring rationale if we have nothing better
  if (signals.length === 0 && contact.recommendation_reason) {
    signals.push(contact.recommendation_reason);
  }

  return signals.slice(0, 4);
}

/**
 * Derive a "health" indicator from last_interaction_at.
 * Mirrors the design's green/yellow/red/gray semantics.
 *
 *   green  = recent (≤30d)
 *   yellow = stale (31–90d)
 *   red    = cold (>90d)
 *   gray   = never contacted
 */
export type RelationshipHealth = "green" | "yellow" | "red" | "gray";

export function getRelationshipHealthFromDate(
  lastInteractionAt: string | null
): RelationshipHealth {
  if (!lastInteractionAt) return "gray";
  const days =
    (Date.now() - new Date(lastInteractionAt).getTime()) /
    (1000 * 60 * 60 * 24);
  if (days <= 30) return "green";
  if (days <= 90) return "yellow";
  return "red";
}
