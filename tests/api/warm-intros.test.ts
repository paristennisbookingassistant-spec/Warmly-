/**
 * tests/api/warm-intros.test.ts
 * Unit tests for GET /api/warm-intros
 *
 * Mocks both the session client (auth) and the service-role client (cross-user reads).
 * Tests: happy path (3 cards), opt-out (0 cards), no bridge peers, unauthorized.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeQueryChain, makeSupabaseMock } from "../helpers/supabase-mock";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const USER_A_ID = "user-a-uuid";
const USER_B_ID = "user-b-uuid";

const USER_A_OPTED_IN = {
  id: USER_A_ID,
  linkedin_urn: "urn:li:fsd_profile:TEST-A",
  share_network_for_intros: true,
  goals: {
    // Broad enough to match all 3 test candidates:
    // Claire Fontaine @ Ardian Private Equity (private equity ✓)
    // Thomas Leroy @ Partech Ventures (ventures / venture ✓)
    // Sophie Marceau, AI Product Manager @ Mistral AI (ai ✓)
    target_industries: ["private equity", "ventures", "ai"],
    target_geographies: ["paris"],
  },
};

const USER_A_NOT_OPTED_IN = {
  id: USER_A_ID,
  linkedin_urn: null,
  share_network_for_intros: false,
  goals: {},
};

const A_CONTACT_FOR_B = {
  id: "contact-ab-bridge",
  linkedin_urn: "urn:li:fsd_profile:TEST-B",
  linkedin_url: "https://www.linkedin.com/in/test-peer-b",
  name: "Test Peer B",
};

const BRIDGE_PEER_B = {
  id: USER_B_ID,
  name: "Test Peer B",
  linkedin_urn: "urn:li:fsd_profile:TEST-B",
  share_network_for_intros: true,
};

const CANDIDATE_1 = {
  id: "cand-1",
  user_id: USER_B_ID,
  name: "Claire Fontaine",
  current_title: "Principal",
  company: "Ardian Private Equity",
  location: "Paris, France",
  linkedin_url: "https://www.linkedin.com/in/claire-fontaine-pe",
  linkedin_urn: "urn:li:fsd_profile:CAND-1",
};

const CANDIDATE_2 = {
  id: "cand-2",
  user_id: USER_B_ID,
  name: "Thomas Leroy",
  current_title: "Investment Manager",
  company: "Partech Ventures",
  location: "Paris, France",
  linkedin_url: "https://www.linkedin.com/in/thomas-leroy-vc",
  linkedin_urn: "urn:li:fsd_profile:CAND-2",
};

const CANDIDATE_3 = {
  id: "cand-3",
  user_id: USER_B_ID,
  name: "Sophie Marceau",
  current_title: "AI Product Manager",
  company: "Mistral AI",
  location: "Paris, France",
  linkedin_url: "https://www.linkedin.com/in/sophie-marceau-ai",
  linkedin_urn: "urn:li:fsd_profile:CAND-3",
};

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockAuthClient = makeSupabaseMock();
const mockServiceClient = makeSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue(mockAuthClient),
  getSupabaseServiceClient: vi.fn().mockReturnValue(mockServiceClient),
}));

const { GET } = await import("@/app/api/warm-intros/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url = "http://localhost/api/warm-intros"): NextRequest {
  return new NextRequest(new Request(url, { method: "GET" }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/warm-intros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Auth always succeeds for most tests
    mockAuthClient.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_A_ID } },
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns optedIn:false and empty cards when A has not opted in", async () => {
    // Service client call 1: fetch user A
    const userAChain = makeQueryChain({ data: USER_A_NOT_OPTED_IN, error: null });
    mockServiceClient.from.mockReturnValueOnce(userAChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.optedIn).toBe(false);
    expect(body.data.cards).toEqual([]);
  });

  it("returns optedIn:true and empty cards when A has no contacts with URNs", async () => {
    // User A is opted in
    const userAChain = makeQueryChain({ data: USER_A_OPTED_IN, error: null });
    // A's contacts: none with linkedin_urn
    const aContactsChain = makeQueryChain({ data: [], error: null });

    mockServiceClient.from
      .mockReturnValueOnce(userAChain)
      .mockReturnValueOnce(aContactsChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.optedIn).toBe(true);
    expect(body.data.cards).toEqual([]);
  });

  it("returns optedIn:true and empty cards when no bridge peers are found", async () => {
    const userAChain = makeQueryChain({ data: USER_A_OPTED_IN, error: null });
    const aContactsChain = makeQueryChain({ data: [A_CONTACT_FOR_B], error: null });
    // No opted-in users matching the URN
    const bridgePeersChain = makeQueryChain({ data: [], error: null });

    mockServiceClient.from
      .mockReturnValueOnce(userAChain)
      .mockReturnValueOnce(aContactsChain)
      .mockReturnValueOnce(bridgePeersChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.optedIn).toBe(true);
    expect(body.data.cards).toEqual([]);
  });

  it("returns 3 warm-intro cards when all data is correct", async () => {
    const userAChain = makeQueryChain({ data: USER_A_OPTED_IN, error: null });
    const aContactsChain = makeQueryChain({
      data: [A_CONTACT_FOR_B],
      error: null,
    });
    const bridgePeersChain = makeQueryChain({
      data: [BRIDGE_PEER_B],
      error: null,
    });
    const candidatesChain = makeQueryChain({
      data: [CANDIDATE_1, CANDIDATE_2, CANDIDATE_3],
      error: null,
    });

    mockServiceClient.from
      .mockReturnValueOnce(userAChain)
      .mockReturnValueOnce(aContactsChain)
      .mockReturnValueOnce(bridgePeersChain)
      .mockReturnValueOnce(candidatesChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.optedIn).toBe(true);
    expect(body.data.cards).toHaveLength(3);

    // Verify card shape
    const card = body.data.cards[0];
    expect(card).toHaveProperty("candidate");
    expect(card.candidate).toHaveProperty("name");
    expect(card.candidate).toHaveProperty("title");
    expect(card.candidate).toHaveProperty("company");
    expect(card.candidate).toHaveProperty("linkedin_url");
    expect(card).toHaveProperty("via");
    expect(card.via).toHaveProperty("peer_name");
    expect(card.via).toHaveProperty("peer_contact_id");
    expect(card).toHaveProperty("match_reason");
    expect(typeof card.match_reason).toBe("string");
    expect(card.match_reason.length).toBeGreaterThan(0);

    // Verify via references B
    expect(card.via.peer_name).toBe("Test Peer B");
    expect(card.via.peer_contact_id).toBe("contact-ab-bridge");
  });

  it("excludes candidates whose linkedin_urn is already in A's contacts", async () => {
    const userAChain = makeQueryChain({ data: USER_A_OPTED_IN, error: null });
    // A already knows CANDIDATE_1
    const aContactsChain = makeQueryChain({
      data: [
        A_CONTACT_FOR_B,
        { id: "already-known", linkedin_urn: CANDIDATE_1.linkedin_urn, linkedin_url: null, name: "Claire" },
      ],
      error: null,
    });
    const bridgePeersChain = makeQueryChain({ data: [BRIDGE_PEER_B], error: null });
    const candidatesChain = makeQueryChain({
      data: [CANDIDATE_1, CANDIDATE_2, CANDIDATE_3],
      error: null,
    });

    mockServiceClient.from
      .mockReturnValueOnce(userAChain)
      .mockReturnValueOnce(aContactsChain)
      .mockReturnValueOnce(bridgePeersChain)
      .mockReturnValueOnce(candidatesChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    // CANDIDATE_1 should be excluded since A already has them
    expect(body.data.cards).toHaveLength(2);
    const names = body.data.cards.map((c: { candidate: { name: string } }) => c.candidate.name);
    expect(names).not.toContain("Claire Fontaine");
    expect(names).toContain("Thomas Leroy");
    expect(names).toContain("Sophie Marceau");
  });

  it("deduplicates candidates across multiple bridge peers", async () => {
    const USER_C_ID = "user-c-uuid";
    const BRIDGE_PEER_C = {
      id: USER_C_ID,
      name: "Test Peer C",
      linkedin_urn: "urn:li:fsd_profile:TEST-C",
      share_network_for_intros: true,
    };
    const A_CONTACT_FOR_C = {
      id: "contact-ac-bridge",
      linkedin_urn: "urn:li:fsd_profile:TEST-C",
      linkedin_url: "https://www.linkedin.com/in/test-peer-c",
      name: "Test Peer C",
    };

    const userAChain = makeQueryChain({ data: USER_A_OPTED_IN, error: null });
    const aContactsChain = makeQueryChain({
      data: [A_CONTACT_FOR_B, A_CONTACT_FOR_C],
      error: null,
    });
    const bridgePeersChain = makeQueryChain({
      data: [BRIDGE_PEER_B, BRIDGE_PEER_C],
      error: null,
    });
    // Both B and C have CANDIDATE_1 in their contacts
    const candidatesChain = makeQueryChain({
      data: [
        CANDIDATE_1, // from B
        { ...CANDIDATE_1, id: "cand-1-dupe", user_id: USER_C_ID }, // same candidate via C
        CANDIDATE_2, // from B
      ],
      error: null,
    });

    mockServiceClient.from
      .mockReturnValueOnce(userAChain)
      .mockReturnValueOnce(aContactsChain)
      .mockReturnValueOnce(bridgePeersChain)
      .mockReturnValueOnce(candidatesChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    // CANDIDATE_1 should appear only once even though two bridge peers have it
    expect(body.data.cards).toHaveLength(2);
    const names = body.data.cards.map((c: { candidate: { name: string } }) => c.candidate.name);
    const claireCount = names.filter((n: string) => n === "Claire Fontaine").length;
    expect(claireCount).toBe(1);
  });

  it("returns 500 when the service client fails to fetch user A", async () => {
    const userAChain = makeQueryChain({ data: null, error: { message: "DB error" } });
    mockServiceClient.from.mockReturnValueOnce(userAChain);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
