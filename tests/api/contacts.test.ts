/**
 * tests/api/contacts.test.ts
 * Tests for the contacts API routes.
 * Mocks Supabase and directly invokes the handler functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeQueryChain, makeSupabaseMock } from "../helpers/supabase-mock";

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockSupabase = makeSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/ai/scoring", () => ({
  scoreContact: vi.fn().mockResolvedValue({
    overall_score: 7.5,
    tier: 1,
    scores: {
      career_path_similarity: 8,
      shared_background: 7,
      seniority_relevance: 7,
      industry_match: 8,
      accessibility_signals: 6,
      recency: 8,
    },
    recommendation_reason: "Good match",
    suggested_hook: "Shared background",
  }),
}));

vi.mock("@/lib/ai/minimax", () => ({
  callMiniMax: vi.fn(),
}));

// Import handlers after mocks
const { GET: getContacts, POST: postContacts } = await import("@/app/api/contacts/route");
const { GET: getContact, PUT: putContact, DELETE: deleteContact } = await import(
  "@/app/api/contacts/[id]/route"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: Parameters<typeof fetch>[1] = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new Request(new URL(url, "http://localhost").toString(), init));
}

const mockContact = {
  id: "contact-uuid-123",
  user_id: "user-test-123",
  name: "Marie Chen",
  company: "Sequoia Capital",
  current_title: "VP of Investments",
  location: "Singapore",
  linkedin_url: null,
  career_history: [],
  education: [],
  profile_snapshot: null,
  relevance_score: 8.2,
  tier: 1,
  scoring_breakdown: null,
  recommendation_reason: null,
  suggested_hook: null,
  source: "manual_chat",
  status: "discovered",
  discovered_at: "2026-04-01T10:00:00Z",
  last_interaction_at: null,
  user_feedback: null,
  discovery_session_id: null,
  notes: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

// ---------------------------------------------------------------------------
// GET /api/contacts
// ---------------------------------------------------------------------------

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns paginated contact list on success", async () => {
    const chain = makeQueryChain({ data: [mockContact], error: null, count: 1 });
    (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockContact],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/contacts");
    const response = await getContacts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.items).toBeInstanceOf(Array);
    expect(body.data.page).toBe(1);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("GET", "http://localhost/api/contacts");
    const response = await getContacts(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid tier query param", async () => {
    const request = makeRequest("GET", "http://localhost/api/contacts?tier=99");
    const response = await getContacts(request);

    expect(response.status).toBe(400);
  });

  it("filters by discovery_session_id and returns pending contacts", async () => {
    const sessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const pendingContact = { ...mockContact, user_action: "pending", discovery_session_id: sessionId };
    const chain = makeQueryChain({ data: [pendingContact], error: null, count: 1 });
    (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [pendingContact],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest(
      "GET",
      `http://localhost/api/contacts?discovery_session_id=${sessionId}&lite=true`
    );
    const response = await getContacts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.items).toBeInstanceOf(Array);
    // The eq("discovery_session_id", ...) method should have been called on the chain
    expect(chain.eq).toHaveBeenCalledWith("discovery_session_id", sessionId);
    // The default triage .or() filter should NOT be applied when discovery_session_id is set
    const orCalls = (chain.or as ReturnType<typeof vi.fn>).mock.calls;
    const triageOrCall = orCalls.find((args: unknown[]) =>
      typeof args[0] === "string" && (args[0] as string).includes("pending")
    );
    expect(triageOrCall).toBeUndefined();
  });

  it("returns 400 for non-UUID discovery_session_id", async () => {
    const request = makeRequest(
      "GET",
      "http://localhost/api/contacts?discovery_session_id=not-a-uuid"
    );
    const response = await getContacts(request);

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/contacts
// ---------------------------------------------------------------------------

describe("POST /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("creates a contact and returns 201", async () => {
    // No linkedin_url → no duplicate check, first from() is the INSERT
    const insertChain = makeQueryChain({ data: mockContact, error: null });
    // subsequent calls: async scoring (fire and forget, we don't care)
    const defaultChain = makeQueryChain({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(insertChain)
      .mockReturnValue(defaultChain);

    const request = makeRequest("POST", "http://localhost/api/contacts", {
      name: "Marie Chen",
      company: "Sequoia Capital",
      source: "manual_chat",
    });

    const response = await postContacts(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.name).toBe("Marie Chen");
  });

  it("returns 400 when name is missing", async () => {
    const request = makeRequest("POST", "http://localhost/api/contacts", {
      company: "Sequoia Capital",
      source: "manual_chat",
    });

    const response = await postContacts(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when source is invalid", async () => {
    const request = makeRequest("POST", "http://localhost/api/contacts", {
      name: "Test",
      source: "invalid_source",
    });

    const response = await postContacts(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/contacts", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await postContacts(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("POST", "http://localhost/api/contacts", {
      name: "Test",
      source: "manual_chat",
    });

    const response = await postContacts(request);
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/contacts/[id]
// ---------------------------------------------------------------------------

describe("GET /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns contact on success", async () => {
    const chain = makeQueryChain({ data: mockContact, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/contacts/contact-uuid-123");
    const response = await getContact(request, {
      params: Promise.resolve({ id: "contact-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe("Marie Chen");
  });

  it("returns 404 when contact not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/contacts/not-found");
    const response = await getContact(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("GET", "http://localhost/api/contacts/any-id");
    const response = await getContact(request, {
      params: Promise.resolve({ id: "any-id" }),
    });

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/contacts/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("updates contact and returns 200", async () => {
    const updatedContact = { ...mockContact, notes: "Updated notes" };

    // First: fetch existing contact
    const fetchChain = makeQueryChain({
      data: { id: mockContact.id, company: "Sequoia", current_title: "VP", career_history: [], education: [], location: "SG" },
      error: null,
    });
    // Second: update call
    const updateChain = makeQueryChain({ data: updatedContact, error: null });

    mockSupabase.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    const request = makeRequest("PUT", "http://localhost/api/contacts/contact-uuid-123", {
      notes: "Updated notes",
    });

    const response = await putContact(request, {
      params: Promise.resolve({ id: "contact-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
  });

  it("returns 400 for invalid status value", async () => {
    const request = makeRequest("PUT", "http://localhost/api/contacts/any-id", {
      status: "invalid_status",
    });

    const response = await putContact(request, {
      params: Promise.resolve({ id: "any-id" }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contacts/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("deletes contact and returns deleted: true", async () => {
    // First: ownership check
    const existingChain = makeQueryChain({ data: { id: mockContact.id }, error: null });
    // Second: delete chain
    const deleteChain = makeQueryChain({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(deleteChain);

    const request = makeRequest("DELETE", "http://localhost/api/contacts/contact-uuid-123");
    const response = await deleteContact(request, {
      params: Promise.resolve({ id: "contact-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when contact does not exist", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("DELETE", "http://localhost/api/contacts/not-found");
    const response = await deleteContact(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});
