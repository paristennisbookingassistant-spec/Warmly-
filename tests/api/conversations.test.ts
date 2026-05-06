/**
 * tests/api/conversations.test.ts
 * Tests for conversations API routes including the main chat (POST messages) endpoint.
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

vi.mock("@/lib/ai/coaching", () => ({
  processCoachingMessage: vi.fn().mockResolvedValue({
    agent_message: "Great question! Let me help you with that.",
    trigger_artifact: undefined,
    model_used: "MiniMax-M2.7-highspeed",
    tokens_input: 500,
    tokens_output: 100,
  }),
  // detectArtifactTrigger is called in the messages route BEFORE deciding
  // coaching vs. artifact path. Tests use plain conversational messages so
  // the trigger never fires — return null to keep them on the coaching path.
  detectArtifactTrigger: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/ai/generation", () => ({
  generateArtifact: vi.fn().mockResolvedValue({
    content: { message: "Hi Marie!", hook: "INSEAD", char_count: 50 },
    model_used: "MiniMax-M2.7-highspeed",
    tokens_input: 400,
    tokens_output: 80,
  }),
}));

vi.mock("@/lib/ai/context", () => ({
  summarizeConversation: vi.fn(),
  SUMMARIZATION_THRESHOLD: 15,
  RECENT_MESSAGES_WINDOW: 5,
}));

vi.mock("@/lib/search", () => ({
  searchCompanyIntel: vi.fn().mockResolvedValue({
    company_name: "Sequoia",
    snippets: [],
    raw_context: "No data",
    cached_at: Date.now(),
  }),
}));

vi.mock("@/lib/ai/minimax", () => ({
  callMiniMax: vi.fn(),
}));

const { GET: getConversations, POST: postConversations } = await import("@/app/api/conversations/route");
const { GET: getConversation, PUT: putConversation, DELETE: deleteConversation } = await import(
  "@/app/api/conversations/[id]/route"
);
const { GET: getMessages, POST: postMessage } = await import(
  "@/app/api/conversations/[id]/messages/route"
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

const mockConversation = {
  id: "conv-uuid-123",
  user_id: "user-test-123",
  type: "general",
  contact_id: null,
  title: "Test conversation",
  status: "active",
  summary: null,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

const mockUserProfile = {
  id: "user-test-123",
  email: "test@example.com",
  name: "Test User",
  career_history: [],
  education: [],
  goals: {
    type: "job_search",
    target_industries: [],
    target_companies: [],
    target_roles: [],
    target_geographies: [],
  },
  networking_preferences: {
    style: "warm",
    outreach_comfort: 3,
    contacts_per_week: 5,
    preferred_channels: ["LinkedIn"],
  },
  user_memory: null,
  subscription_status: "active",
  subscription_tier: "pro",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// GET /api/conversations
// ---------------------------------------------------------------------------

describe("GET /api/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns paginated conversations on success", async () => {
    const chain = makeQueryChain({ data: [mockConversation], error: null, count: 1 });
    (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockConversation],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/conversations");
    const response = await getConversations(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.items).toBeInstanceOf(Array);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("GET", "http://localhost/api/conversations");
    const response = await getConversations(request);

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/conversations
// ---------------------------------------------------------------------------

describe("POST /api/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("creates a general conversation and returns 201", async () => {
    const chain = makeQueryChain({ data: mockConversation, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("POST", "http://localhost/api/conversations", {
      type: "general",
      title: "Test conversation",
    });

    const response = await postConversations(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.type).toBe("general");
  });

  it("returns 400 for invalid type", async () => {
    const request = makeRequest("POST", "http://localhost/api/conversations", {
      type: "invalid_type",
    });

    const response = await postConversations(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("POST", "http://localhost/api/conversations", {
      type: "general",
    });

    const response = await postConversations(request);
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/conversations/[id]
// ---------------------------------------------------------------------------

describe("GET /api/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns conversation on success", async () => {
    const chain = makeQueryChain({ data: mockConversation, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/conversations/conv-uuid-123");
    const response = await getConversation(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("Test conversation");
  });

  it("returns 404 when conversation not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/conversations/not-found");
    const response = await getConversation(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/conversations/[id]/messages — main chat flow
// ---------------------------------------------------------------------------

describe("POST /api/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("saves user message and returns agent response on success", async () => {
    const mockUserMsg = {
      id: "msg-user-1",
      conversation_id: "conv-uuid-123",
      role: "user",
      content: "Help me network",
      artifacts_generated: [],
      created_at: "2026-04-01T10:00:00Z",
    };
    const mockAgentMsg = {
      id: "msg-agent-1",
      conversation_id: "conv-uuid-123",
      role: "agent",
      content: "Great question! Let me help you with that.",
      artifacts_generated: [],
      created_at: "2026-04-01T10:00:01Z",
    };

    // Build the conversation_messages chain up front so single() can be queued
    const msgChain = makeQueryChain({ data: [], error: null, count: 0 });
    (msgChain.range as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: [], error: null, count: 0 });
    (msgChain.single as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: mockUserMsg, error: null })
      .mockResolvedValueOnce({ data: mockAgentMsg, error: null });

    // Set up from() calls using mockReturnValueOnce to control ordering:
    // 1st call: conversations (fetch single conv by id)
    // 2nd call: conversations (rate-limit array query — needs array data)
    // 3rd call: conversation_messages (rate-limit count query)
    // 4th call: users (load user profile)
    // 5th call: conversation_messages (recent messages + inserts — re-use msgChain)
    // 6th call: artifacts (artifact metadata)
    mockSupabase.from
      .mockReturnValueOnce(makeQueryChain({ data: mockConversation, error: null }))
      .mockReturnValueOnce(makeQueryChain({ data: [{ id: mockConversation.id }], error: null }))
      .mockReturnValueOnce(makeQueryChain({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeQueryChain({ data: mockUserProfile, error: null }))
      .mockReturnValueOnce(msgChain)
      .mockReturnValue(makeQueryChain({ data: [], error: null, count: 0 }));

    const request = makeRequest(
      "POST",
      "http://localhost/api/conversations/conv-uuid-123/messages",
      { content: "Help me network with people at Sequoia" }
    );

    const response = await postMessage(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({
      user_message: expect.any(Object),
      agent_message: expect.any(Object),
      artifacts_created: expect.any(Array),
    });
  });

  it("returns 400 when content is empty", async () => {
    const request = makeRequest(
      "POST",
      "http://localhost/api/conversations/conv-uuid-123/messages",
      { content: "" }
    );

    const response = await postMessage(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when body is missing", async () => {
    const request = makeRequest(
      "POST",
      "http://localhost/api/conversations/conv-uuid-123/messages"
    );

    const response = await postMessage(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest(
      "POST",
      "http://localhost/api/conversations/conv-uuid-123/messages",
      { content: "Hello" }
    );

    const response = await postMessage(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when conversation not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest(
      "POST",
      "http://localhost/api/conversations/not-found/messages",
      { content: "Hello" }
    );

    const response = await postMessage(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/conversations/[id]/messages
// ---------------------------------------------------------------------------

describe("GET /api/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns paginated messages on success", async () => {
    const mockMsg = {
      id: "msg-1",
      conversation_id: "conv-uuid-123",
      role: "user",
      content: "Hello",
      artifacts_generated: [],
      created_at: "2026-04-01T10:00:00Z",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "conversations") {
        return makeQueryChain({ data: { id: "conv-uuid-123" }, error: null });
      }
      const chain = makeQueryChain({ data: [mockMsg], error: null, count: 1 });
      (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockMsg],
        error: null,
        count: 1,
      });
      return chain;
    });

    const request = makeRequest("GET", "http://localhost/api/conversations/conv-uuid-123/messages");
    const response = await getMessages(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toBeInstanceOf(Array);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/conversations/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("updates title and returns 200", async () => {
    const updated = { ...mockConversation, title: "Updated title" };

    const existingChain = makeQueryChain({ data: { id: mockConversation.id }, error: null });
    const updateChain = makeQueryChain({ data: updated, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updateChain);

    const request = makeRequest("PUT", "http://localhost/api/conversations/conv-uuid-123", {
      title: "Updated title",
    });

    const response = await putConversation(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("Updated title");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/conversations/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("deletes conversation and returns deleted: true", async () => {
    const existingChain = makeQueryChain({ data: { id: mockConversation.id }, error: null });
    const deleteChain = makeQueryChain({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(deleteChain);

    const request = makeRequest("DELETE", "http://localhost/api/conversations/conv-uuid-123");
    const response = await deleteConversation(request, {
      params: Promise.resolve({ id: "conv-uuid-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when conversation not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("DELETE", "http://localhost/api/conversations/not-found");
    const response = await deleteConversation(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});
