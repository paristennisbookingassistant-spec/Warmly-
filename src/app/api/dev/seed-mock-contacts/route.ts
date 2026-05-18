/**
 * POST /api/dev/seed-mock-contacts
 *
 * Dev-only endpoint used by the headless tester for the Tinder review
 * flow. Seeds 5 realistic Parloa-themed pending-review contacts for the
 * calling user so the swipe deck has something to triage.
 *
 * Why this exists: triggering real LinkedIn discovery from a headless
 * test is brittle — the extension popup's click handlers behave
 * differently when the popup HTML is loaded as a regular tab vs. via
 * Chrome's action-popup context (which the tester can't invoke
 * programmatically). For the AGENT LOOP, we seed mock contacts so the
 * swipe UI gets verified end-to-end. For REAL-DISCOVERY validation,
 * the user runs it manually in real Chrome.
 *
 * Gated to emails in TEST_USER_EMAILS env var. First clears any
 * existing pending contacts for the user to keep tests deterministic.
 *
 * Returns: { seeded: <count>, deleted: <count> }
 */

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  forbidden,
  internalError,
} from "@/lib/api/helpers";

function isWhitelistedEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.TEST_USER_EMAILS || "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return allowed.includes(email.toLowerCase());
}

/**
 * Five realistic Parloa + INSEAD profile shapes. Plausible-but-fake — not
 * actual people. Each has a different tier, role family, and rationale
 * so the tester can verify visual variety and field rendering.
 */
const MOCK_CONTACTS = [
  {
    name: "Anna Schmidt",
    current_title: "Senior Product Manager",
    company: "Parloa",
    location: "Berlin, Germany",
    // Use pravatar.cc with a deterministic seed per mock contact — gives
    // each card a distinct placeholder photo so the deck looks complete
    // without using any real LinkedIn user's image.
    relevance_score: 9,
    tier: 1 as const,
    recommendation_reason:
      "She made the same Bain-to-Parloa pivot you're targeting, came out of your INSEAD 22D Fontainebleau class, and now leads the conversational-AI product line that overlaps directly with your AI agent interest.",
    suggested_hook: "Shared Bain alumni + INSEAD MBA + AI product pivot",
    education: [{ school: "INSEAD", degree: "MBA", year: "2022" }],
  },
  {
    name: "Mathieu Lefèvre",
    current_title: "Head of Strategy",
    company: "Parloa",
    location: "Paris, France",
    // Use pravatar.cc with a deterministic seed per mock contact — gives
    // each card a distinct placeholder photo so the deck looks complete
    // without using any real LinkedIn user's image.
    relevance_score: 8,
    tier: 1 as const,
    recommendation_reason:
      "He's an INSEAD 24J alumnus based in Paris who came to Parloa from McKinsey, and he likely sees a hundred outreach requests from MBAs so keep yours short and specific.",
    suggested_hook: "Paris-based INSEAD alumnus, consulting background",
    education: [
      { school: "INSEAD", degree: "MBA", year: "2024" },
      { school: "HEC Paris", degree: "MSc Strategy", year: "2017" },
    ],
  },
  {
    name: "Sofia Russo",
    current_title: "Customer Success Director",
    company: "Parloa",
    location: "Munich, Germany",
    // Use pravatar.cc with a deterministic seed per mock contact — gives
    // each card a distinct placeholder photo so the deck looks complete
    // without using any real LinkedIn user's image.
    relevance_score: 6,
    tier: 2 as const,
    recommendation_reason:
      "She's an INSEAD 21D alumna whose Customer Success role is adjacent to your strategy and product target, but she's well-positioned to give you the inside view on Parloa's commercial motion.",
    suggested_hook: "Inside view on Parloa's commercial motion",
    education: [{ school: "INSEAD", degree: "MBA", year: "2021" }],
  },
  {
    name: "Karim Benabderrahmane",
    current_title: "Engineering Manager",
    company: "Parloa",
    location: "Berlin, Germany",
    // Use pravatar.cc with a deterministic seed per mock contact — gives
    // each card a distinct placeholder photo so the deck looks complete
    // without using any real LinkedIn user's image.
    relevance_score: 5,
    tier: 3 as const,
    recommendation_reason:
      "He's an INSEAD MIM 23 alumnus on the engineering side at Parloa, which makes him a lower-tier fit for your strategy and VC angle but a useful contact if you want a technical view on the product.",
    suggested_hook: "INSEAD MIM, eng-side product view",
    education: [{ school: "INSEAD", degree: "MIM", year: "2023" }],
  },
  {
    name: "Elena Rossi",
    current_title: "Marketing Lead",
    company: "Parloa",
    location: "Berlin, Germany",
    // Use pravatar.cc with a deterministic seed per mock contact — gives
    // each card a distinct placeholder photo so the deck looks complete
    // without using any real LinkedIn user's image.
    relevance_score: 7,
    tier: 2 as const,
    recommendation_reason:
      "She's an INSEAD 23J alumna who came to Parloa from HubSpot with a B2B SaaS marketing background, and she could open doors at other B2B AI companies in your VC target universe.",
    suggested_hook: "B2B SaaS network, HubSpot alumna",
    education: [
      { school: "INSEAD", degree: "MBA", year: "2023" },
      { school: "Bocconi University", degree: "BSc", year: "2018" },
    ],
  },
];

export async function POST(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  if (!isWhitelistedEmail(user.email)) {
    return forbidden();
  }

  // Clear ALL prior mock contacts so the test starts deterministic.
  // We identify them by the linkedin_url pattern we use below — that
  // includes "qa-mock-<user-uuid-prefix>-<index>" which is unique to
  // this seeding flow. We do NOT touch real contacts (those have real
  // linkedin.com/in/<slug> URLs).
  const mockUrlPrefix = `https://www.linkedin.com/in/qa-mock-${user.id.slice(0, 8)}-`;
  const { data: deletedRows } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", user.id)
    .like("linkedin_url", `${mockUrlPrefix}%`)
    .select("id");

  // Insert the mock set. Use fake LinkedIn URLs so the UNIQUE constraint
  // on (user_id, linkedin_url) is satisfied.
  const now = new Date().toISOString();
  const rows = MOCK_CONTACTS.map((m, i) => ({
    user_id: user.id,
    name: m.name,
    linkedin_url: `https://www.linkedin.com/in/qa-mock-${user.id.slice(0, 8)}-${i}`,
    current_title: m.current_title,
    company: m.company,
    location: m.location,
    // Deterministic placeholder photo per mock contact. Pravatar serves
    // CC-licensed portraits keyed by `u=<seed>` so each card shows a
    // different face. Seed by index so the same mock always gets the
    // same photo (helps with visual diff tests).
    avatar_url: `https://i.pravatar.cc/150?u=warmly-qa-${i}`,
    source: "discovery" as const,
    status: "discovered" as const,
    discovered_at: now,
    user_action: "pending" as const,
    education: m.education,
    career_history: [],
    relevance_score: m.relevance_score,
    tier: m.tier,
    recommendation_reason: m.recommendation_reason,
    suggested_hook: m.suggested_hook,
    profile_snapshot: { mutual_connections: 2 + i },
  }));

  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert(rows)
    .select("id, name");

  if (error) {
    console.error("seed-mock-contacts insert failed:", error);
    return internalError("Failed to seed mock contacts");
  }

  return NextResponse.json({
    data: {
      seeded: (inserted ?? []).length,
      deleted: (deletedRows ?? []).length,
      sample_names: (inserted ?? []).slice(0, 3).map((r) => r.name),
    },
    error: null,
  });
}
