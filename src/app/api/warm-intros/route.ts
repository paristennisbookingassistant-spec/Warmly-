/**
 * GET /api/warm-intros
 *
 * Returns 2nd-degree warm-intro candidate cards for the authenticated user A.
 *
 * Matching logic (server-side, service-role client):
 *  1. If A is not opted in  → { optedIn: false, cards: [] }
 *  2. Find bridge peers B: opted-in users whose own linkedin_urn appears in
 *     A's contacts (meaning A is connected to B on LinkedIn).
 *  3. Collect B's contacts that match A's goal (target_industries overlap,
 *     optional geo). Exclude candidates A already knows or who are A.
 *  4. Dedupe by linkedin_url/name; strongest-bridge wins; cap at 25.
 *
 * Uses SERVICE-ROLE client to read across user rows (consent-gated strictly).
 * Never returns B's full network — only matched candidates + provenance.
 *
 * Privacy guarantees:
 *  - Both A and B must have share_network_for_intros = true.
 *  - Only matched candidates (not B's full contact list) are returned to A.
 *  - No browsable graph is ever exposed.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { unauthorized, internalError } from "@/lib/api/helpers";
import type { GetWarmIntrosResponse, WarmIntroCard } from "@/types/api";

// ---------------------------------------------------------------------------
// Zod schema — no query params for MVP, but validate if any are ever added
// ---------------------------------------------------------------------------

const QuerySchema = z.object({}).strip();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CARDS = 25;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  // 1. Authenticate user A with the normal session-scoped client
  const authClient = await getSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();
  if (!authUser) return unauthorized();

  // Validate query params (none for now — future: ?goal_id)
  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());
  const parsed = QuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          field_errors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  try {
    // Use service-role client for all cross-user reads (consent gated strictly below)
    const svc = getSupabaseServiceClient();

    // 2. Fetch user A's own row to check opt-in status and goals
    const { data: userA, error: userAError } = await svc
      .from("users")
      .select("id, linkedin_urn, share_network_for_intros, goals")
      .eq("id", authUser.id)
      .single();

    if (userAError || !userA) {
      console.error("[warm-intros] failed to fetch user A:", userAError);
      return internalError("Failed to load user profile");
    }

    // 2a. Consent gate: A must be opted in
    if (!userA.share_network_for_intros) {
      const response: GetWarmIntrosResponse = {
        data: { optedIn: false, cards: [] },
        error: null,
      };
      return NextResponse.json(response);
    }

    // 3. Fetch A's contacts (need linkedin_urn to find bridge peers, and linkedin_url
    //    to exclude already-known candidates later)
    // NOTE: Supabase returns max 1000 rows by default; A's network can be larger
    // (1300+), so fetch a wide range to include all bridge candidates. Scale TODO:
    // for very large networks, replace this with targeted queries on the (few)
    // opted-in users' urns instead of pulling A's whole network into memory.
    const { data: aContacts, error: aContactsError } = await svc
      .from("contacts")
      .select("id, linkedin_urn, linkedin_url, name")
      .eq("user_id", authUser.id)
      .not("linkedin_urn", "is", null)
      .range(0, 9999);

    if (aContactsError) {
      console.error("[warm-intros] failed to fetch A's contacts:", aContactsError);
      return internalError("Failed to load your contacts");
    }

    const aContactUrns = new Set(
      (aContacts ?? []).map((c: { linkedin_urn: string | null }) => c.linkedin_urn).filter(Boolean) as string[]
    );
    const aContactUrls = new Set(
      (aContacts ?? []).map((c: { linkedin_url: string | null }) => c.linkedin_url).filter(Boolean) as string[]
    );
    // Build a map from linkedin_urn → contact.id (for via.peer_contact_id lookup)
    const aUrnToContactId = new Map<string, string>(
      (aContacts ?? [])
        .filter((c: { linkedin_urn: string | null; id: string }) => c.linkedin_urn)
        .map((c: { linkedin_urn: string; id: string }) => [c.linkedin_urn, c.id])
    );

    if (aContactUrns.size === 0) {
      // A has no contacts with urns — cannot find any bridge peers
      const response: GetWarmIntrosResponse = {
        data: { optedIn: true, cards: [] },
        error: null,
      };
      return NextResponse.json(response);
    }

    // 4. Find bridge peers B: opted-in users (a SMALL set) that A is connected to.
    //    Fetch all opted-in users first, then intersect with A's contact urns in
    //    memory — A's network can be thousands of urns, so an IN() over them would
    //    overflow the request URL. Opted-in users are few; this scales.
    const { data: optedInUsers, error: bridgePeersError } = await svc
      .from("users")
      .select("id, name, linkedin_urn, share_network_for_intros")
      .eq("share_network_for_intros", true)
      .not("linkedin_urn", "is", null)
      .neq("id", authUser.id);

    if (bridgePeersError) {
      console.error("[warm-intros] failed to fetch bridge peers:", bridgePeersError);
      return internalError("Failed to find bridge peers");
    }

    const bridgePeers = (optedInUsers ?? []).filter(
      (b: { linkedin_urn: string | null }) =>
        b.linkedin_urn !== null && aContactUrns.has(b.linkedin_urn)
    );

    if (!bridgePeers || bridgePeers.length === 0) {
      const response: GetWarmIntrosResponse = {
        data: { optedIn: true, cards: [] },
        error: null,
      };
      return NextResponse.json(response);
    }

    const bridgePeerIds = bridgePeers.map((b: { id: string }) => b.id);
    const bridgePeerMap = new Map<string, { id: string; name: string; linkedin_urn: string }>(
      bridgePeers.map((b: { id: string; name: string; linkedin_urn: string }) => [b.id, b])
    );

    // 5. Collect B's contacts (2nd-degree candidates)
    //    We need: name, current_title, company, location, linkedin_url, linkedin_urn, user_id
    const { data: candidateContacts, error: candidatesError } = await svc
      .from("contacts")
      .select("id, user_id, name, current_title, company, location, linkedin_url, linkedin_urn")
      .in("user_id", bridgePeerIds);

    if (candidatesError) {
      console.error("[warm-intros] failed to fetch candidates:", candidatesError);
      return internalError("Failed to fetch 2nd-degree candidates");
    }

    if (!candidateContacts || candidateContacts.length === 0) {
      const response: GetWarmIntrosResponse = {
        data: { optedIn: true, cards: [] },
        error: null,
      };
      return NextResponse.json(response);
    }

    // 6. Build goal filter from A's target_industries (and optionally target_geographies)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const goals = userA.goals as any;
    const targetIndustries: string[] = goals?.target_industries ?? [];
    const targetGeos: string[] = goals?.target_geographies ?? [];
    // Normalise to lowercase for matching
    const targetIndustriesLower = targetIndustries.map((s: string) => s.toLowerCase());
    const targetGeosLower = targetGeos.map((s: string) => s.toLowerCase());

    // Goal-filter helper: returns a match_reason string or null if no match
    function goalMatchReason(
      candidate: {
        name: string;
        current_title: string | null;
        company: string | null;
        location: string | null;
      }
    ): string | null {
      // If A has no goal configured, accept all candidates
      if (targetIndustriesLower.length === 0 && targetGeosLower.length === 0) {
        return `${candidate.current_title ?? "Professional"} at ${candidate.company ?? "their company"} — reachable via your network.`;
      }

      const titleLower = (candidate.current_title ?? "").toLowerCase();
      const companyLower = (candidate.company ?? "").toLowerCase();
      const locationLower = (candidate.location ?? "").toLowerCase();

      // Industry overlap check: any target industry keyword found in title or company
      const industryMatch = targetIndustriesLower.find(
        (ind) => titleLower.includes(ind) || companyLower.includes(ind)
      );

      // Geo overlap (optional — if A has geo targets, prefer matches but don't hard-exclude)
      const geoMatch =
        targetGeosLower.length === 0 ||
        targetGeosLower.some((geo) => locationLower.includes(geo));

      if (industryMatch && geoMatch) {
        const geoNote = candidate.location ? ` in ${candidate.location}` : "";
        return `${candidate.current_title ?? "Professional"} at ${candidate.company ?? "their company"}${geoNote} — matches your ${industryMatch} target.`;
      }

      // If no industry match and geo targets exist, check geo-only as a weaker signal
      if (geoMatch && targetGeosLower.length > 0 && targetIndustriesLower.length === 0) {
        return `${candidate.current_title ?? "Professional"} at ${candidate.company ?? "their company"} in your target location.`;
      }

      return null; // No match
    }

    // 7. Filter, dedupe, and build cards
    // Deduplication key: linkedin_urn (preferred) or linkedin_url or name
    type CandidateRow = {
      id: string;
      user_id: string;
      name: string;
      current_title: string | null;
      company: string | null;
      location: string | null;
      linkedin_url: string | null;
      linkedin_urn: string | null;
    };

    const seen = new Map<string, WarmIntroCard>(); // dedup key → card

    for (const candidate of candidateContacts as CandidateRow[]) {
      // Exclude candidates A already knows
      if (candidate.linkedin_urn && aContactUrns.has(candidate.linkedin_urn)) continue;
      if (candidate.linkedin_url && aContactUrls.has(candidate.linkedin_url)) continue;
      // Exclude A's own profile
      if (candidate.linkedin_urn && candidate.linkedin_urn === userA.linkedin_urn) continue;

      // Goal filter
      const matchReason = goalMatchReason(candidate);
      if (matchReason === null) continue;

      // Look up bridge peer for this candidate
      const bridgePeer = bridgePeerMap.get(candidate.user_id);
      if (!bridgePeer) continue;

      // Find B's contact_id in A's contacts (via A's contact whose urn = B.linkedin_urn)
      const peerContactId = aUrnToContactId.get(bridgePeer.linkedin_urn) ?? "";

      // Dedup key: linkedin_urn > linkedin_url > name
      const dedupKey = candidate.linkedin_urn ?? candidate.linkedin_url ?? candidate.name;

      // If we've already seen this candidate, keep first occurrence (arbitrary bridge)
      if (!seen.has(dedupKey)) {
        seen.set(dedupKey, {
          candidate: {
            name: candidate.name,
            title: candidate.current_title,
            company: candidate.company,
            linkedin_url: candidate.linkedin_url,
          },
          via: {
            peer_name: bridgePeer.name,
            peer_contact_id: peerContactId,
          },
          match_reason: matchReason,
        });
      }

      if (seen.size >= MAX_CARDS) break;
    }

    const cards = Array.from(seen.values());

    const response: GetWarmIntrosResponse = {
      data: { optedIn: true, cards },
      error: null,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[warm-intros] unexpected error:", err);
    return internalError("Warm-intros matching failed");
  }
}
