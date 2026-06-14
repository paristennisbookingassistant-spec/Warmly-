/**
 * cadence.ts
 * Shared, pure utility functions for CRM relationship-maintenance cadence logic.
 * Importable by both backend routes and frontend components (single source of truth).
 * No I/O, no side-effects — 100% pure / unit-testable.
 *
 * Taxonomy (4 buckets, locked 2026-06-14):
 *   nurturing   → 14d  (newly created relationships — keep momentum)
 *   keep_warm   → 30d  (senior/professional: clients, partners, professors)
 *   inner_circle → 60d (close ties: classmates, close coworkers)
 *   dormant     → null (muted — no reminders)
 *   null        → null (uncategorized — no reminders until tagged)
 */

import type { RelationshipCategory } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default cadence in days for each category.
 * null = no reminders (dormant or uncategorized).
 */
export const CATEGORY_CADENCE: Record<RelationshipCategory, number | null> = {
  nurturing: 14,
  keep_warm: 30,
  inner_circle: 60,
  dormant: null,
};

/**
 * Human-readable label for each category (for dropdowns, UI chips, etc.)
 */
export const CATEGORY_LABEL: Record<RelationshipCategory, string> = {
  nurturing: "Nurturing",
  keep_warm: "Keep Warm",
  inner_circle: "Inner Circle",
  dormant: "Dormant",
};

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

/**
 * Resolves the effective cadence in days for a given category + optional
 * per-contact override. Returns null when:
 *   - category is null (uncategorized)
 *   - category is "dormant"
 *   - override is provided but <= 0
 */
export function effectiveCadenceDays(
  category: RelationshipCategory | null,
  override: number | null
): number | null {
  if (!category) return null;

  // Per-contact override beats the category default when valid (>= 1)
  if (override !== null && override !== undefined) {
    return override >= 1 ? override : null;
  }

  return CATEGORY_CADENCE[category];
}

/**
 * Computes the next "due" touch timestamp for a contact.
 *
 * anchor = lastInteractionAt ?? now()
 * result = anchor + effectiveCadenceDays
 *
 * Returns an ISO-8601 string, or null when no cadence applies
 * (dormant / uncategorized / invalid override).
 *
 * @param category  - The contact's current RelationshipCategory (or null)
 * @param override  - Per-contact cadence override in days (or null)
 * @param lastInteractionAt - ISO string of the last interaction, or null
 */
export function computeNextTouchAt(
  category: RelationshipCategory | null,
  override: number | null,
  lastInteractionAt: string | null
): string | null {
  const cadence = effectiveCadenceDays(category, override);
  if (cadence === null) return null;

  const anchor = lastInteractionAt ? new Date(lastInteractionAt) : new Date();
  const nextTouch = new Date(anchor.getTime() + cadence * 24 * 60 * 60 * 1000);
  return nextTouch.toISOString();
}

/**
 * Returns true when the contact is due (or overdue) for a reconnect.
 * A null nextTouchAt means no cadence is set → never due.
 */
export function isReconnectDue(nextTouchAt: string | null): boolean {
  if (!nextTouchAt) return false;
  return new Date(nextTouchAt) <= new Date();
}
