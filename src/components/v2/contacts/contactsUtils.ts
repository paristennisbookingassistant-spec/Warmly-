/**
 * components/v2/contacts/contactsUtils.ts
 * Pure helpers for the contacts list — date formatting, follow-up derivation.
 */

import type { ContactStatusValue } from "@/components/v2/primitives";
import type { ISODateString } from "@/types/database";

/** Relative time label — "2d ago", "3w ago", etc. — or "Never" if null. */
export function relativeTime(iso: ISODateString | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 13) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Follow-up is due when the contact is in contacted|connected state
 * AND the last interaction was more than 30 days ago (or null).
 */
export function deriveFollowUpDue(
  status: ContactStatusValue,
  lastInteractionAt: ISODateString | null
): boolean {
  if (status !== "contacted" && status !== "connected") return false;
  if (!lastInteractionAt) return true;
  const days = (Date.now() - new Date(lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24);
  return days > 30;
}

/** "Saved today" = user_action became 'saved'/'starred' in the last 24h.
 *  We approximate using reviewed_at; fall back to created_at. */
export function isSavedToday(
  reviewedAt: ISODateString | null,
  createdAt: ISODateString
): boolean {
  const anchor = reviewedAt ?? createdAt;
  const diff = Date.now() - new Date(anchor).getTime();
  return diff < 24 * 60 * 60 * 1000;
}

/** Format an ISO date as "12 May 2025" */
export function formatFullDate(iso: ISODateString | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Strips a phone string to digits only, removes a leading "00" international
 * prefix (wa.me wants the country code without `+` or `00`), then returns the
 * full `https://wa.me/<digits>` URL.
 *
 * Examples:
 *   "+44 7493 550627"      → "https://wa.me/447493550627"
 *   "+33-07-66-92-64-99"   → "https://wa.me/330766926499"
 *   "0033 6 12 34 56 78"   → "https://wa.me/33612345678"
 */
export function phoneToWaLink(phone: string): string {
  // Strip every character that isn't a digit
  let digits = phone.replace(/\D/g, "");
  // Remove a leading "00" (international dialling prefix) so country code is bare
  if (digits.startsWith("00")) digits = digits.slice(2);
  return `https://wa.me/${digits}`;
}

/** Detect INSEAD from education_v2 entries. Returns short label e.g. "MBA Dec'26". */
export function detectInsead(
  educationV2: Array<{ school: string; degree?: string; dateRange: { start: string | null; end: string | null } }> | null
): string | null {
  if (!educationV2) return null;
  const entry = educationV2.find((e) => /insead/i.test(e.school));
  if (!entry) return null;
  const endYear = entry.dateRange.end
    ? new Date(entry.dateRange.end).getFullYear().toString().slice(2)
    : null;
  const degree = entry.degree ? entry.degree.replace(/master of business administration/i, "MBA") : "MBA";
  return endYear ? `${degree} '${endYear}` : degree;
}
