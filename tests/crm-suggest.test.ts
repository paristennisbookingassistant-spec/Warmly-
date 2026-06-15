/**
 * tests/crm-suggest.test.ts
 * Unit tests for src/lib/crm/suggestCategory.ts
 *
 * Covers:
 * 1. INSEAD in education_v2   → inner_circle
 * 2. INSEAD in education      → inner_circle
 * 3. source === "cv_book"     → inner_circle
 * 4. Senior title             → keep_warm
 * 5. Generic new contact      → nurturing
 * 6. Empty contact            → null
 * 7. INSEAD beats senior title (priority order)
 */

import { describe, it, expect } from "vitest";
import { suggestCategory } from "../src/lib/crm/suggestCategory";
import type { Contact } from "../src/types/database";

// ---------------------------------------------------------------------------
// Minimal contact factory — only fields relevant to suggestCategory
// ---------------------------------------------------------------------------

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "test-id",
    user_id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    linkedin_url: null,
    name: "Test Contact",
    current_title: null,
    company: null,
    location: null,
    career_history: [],
    education: [],
    profile_snapshot: null,
    relevance_score: null,
    tier: null,
    scoring_breakdown: null,
    recommendation_reason: null,
    suggested_hook: null,
    source: "manual_chat",
    status: "discovered",
    discovered_at: "2026-01-01T00:00:00.000Z",
    last_interaction_at: null,
    user_feedback: null,
    discovery_session_id: null,
    notes: null,
    relationship_category: null,
    cadence_days: null,
    next_touch_at: null,
    avatar_url: null,
    user_action: null,
    reviewed_at: null,
    linkedin_urn: null,
    linkedin_bio: null,
    experience: null,
    education_v2: null,
    photo_url: null,
    sync_job_id: null,
    directory_profile_id: null,
    phone: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("suggestCategory", () => {
  // ── inner_circle via INSEAD ──────────────────────────────────────────────

  it("returns inner_circle when education_v2 contains INSEAD (exact case)", () => {
    const contact = makeContact({
      education_v2: [
        { school: "INSEAD", degree: "MBA", dateRange: { start: "2025-09", end: "2026-12" } },
      ],
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("inner_circle");
  });

  it("returns inner_circle when education_v2 contains INSEAD (mixed case)", () => {
    const contact = makeContact({
      education_v2: [
        { school: "Insead Business School", dateRange: { start: "2024-01", end: "2025-12" } },
      ],
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("inner_circle");
  });

  it("returns inner_circle when structured education array mentions INSEAD", () => {
    const contact = makeContact({
      education: [
        { school: "INSEAD", degree: "MBA", field: "Business", year: "2026" },
      ],
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("inner_circle");
  });

  it("returns inner_circle for source === cv_book regardless of education", () => {
    const contact = makeContact({
      source: "cv_book",
      current_title: "Associate",
      company: "McKinsey",
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("inner_circle");
  });

  // ── keep_warm via senior title ───────────────────────────────────────────

  it("returns keep_warm for a title containing Partner", () => {
    const contact = makeContact({ current_title: "Partner, McKinsey & Company" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for a title containing Director", () => {
    const contact = makeContact({ current_title: "Senior Director of Product" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for VP title", () => {
    const contact = makeContact({ current_title: "VP Engineering" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for Vice President (two words)", () => {
    const contact = makeContact({ current_title: "Vice President, Sales" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for CEO", () => {
    const contact = makeContact({ current_title: "CEO & Co-founder" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for Founder", () => {
    const contact = makeContact({ current_title: "Founder at DeepTech Startup" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("keep_warm");
  });

  it("returns keep_warm for Professor", () => {
    const contact = makeContact({ current_title: "Professor of Finance, INSEAD" });
    // INSEAD is in the title — inner_circle wins over keep_warm
    // (separate test below for priority). This verifies keep_warm for professor otherwise.
    const contact2 = makeContact({ current_title: "Professor of Strategy, HEC Paris" });
    const result = suggestCategory(contact2);
    expect(result?.category).toBe("keep_warm");
    // Keep the first contact test for INSEAD priority
    const result1 = suggestCategory(contact);
    expect(result1?.category).toBe("inner_circle");
  });

  // ── nurturing fallback ───────────────────────────────────────────────────

  it("returns nurturing when no INSEAD signal and no senior title", () => {
    const contact = makeContact({
      name: "Junior Analyst",
      current_title: "Business Analyst",
      company: "Deloitte",
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("nurturing");
  });

  it("returns nurturing even with only a name", () => {
    const contact = makeContact({ name: "Someone New" });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("nurturing");
  });

  // ── null when no usable data ─────────────────────────────────────────────

  it("returns null when contact has no usable fields", () => {
    const contact = makeContact({ name: "" });
    // name empty, no title, no company → null
    const result = suggestCategory({ ...contact, name: "", current_title: null, company: null });
    expect(result).toBeNull();
  });

  // ── priority: INSEAD beats senior title ──────────────────────────────────

  it("returns inner_circle (not keep_warm) when both INSEAD signal and senior title present", () => {
    const contact = makeContact({
      current_title: "Managing Director",
      education_v2: [
        { school: "INSEAD", degree: "MBA", dateRange: { start: "2025-01", end: "2026-12" } },
      ],
    });
    const result = suggestCategory(contact);
    expect(result?.category).toBe("inner_circle");
  });

  // ── reason strings ───────────────────────────────────────────────────────

  it("provides a non-empty reason string for every non-null result", () => {
    const cases: Partial<Contact>[] = [
      { source: "cv_book" },
      { current_title: "Partner at Bain" },
      { name: "Someone", current_title: "Analyst" },
    ];
    for (const c of cases) {
      const result = suggestCategory(makeContact(c));
      expect(result?.reason.length).toBeGreaterThan(0);
    }
  });

  // ── dormant is never suggested ───────────────────────────────────────────

  it("never returns dormant as a suggestion", () => {
    const cases: Partial<Contact>[] = [
      { source: "cv_book" },
      { current_title: "CEO" },
      { name: "John Doe" },
    ];
    for (const c of cases) {
      const result = suggestCategory(makeContact(c));
      expect(result?.category).not.toBe("dormant");
    }
  });
});
