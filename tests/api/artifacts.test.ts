/**
 * tests/api/artifacts.test.ts
 * Tests for artifact CRUD API routes.
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

vi.mock("@/lib/ai/context", () => ({
  extractStylePreferences: vi.fn(),
  createEmptyUserMemory: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  function AnthropicMock() {
    return { messages: { create: vi.fn() } };
  }
  return { default: AnthropicMock };
});

const { GET: getArtifacts, POST: postArtifact } = await import("@/app/api/artifacts/route");
const { GET: getArtifact, PUT: putArtifact, DELETE: deleteArtifact } = await import(
  "@/app/api/artifacts/[id]/route"
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

const mockArtifact = {
  id: "artifact-uuid-456",
  user_id: "user-test-123",
  contact_id: "550e8400-e29b-41d4-a716-446655440001",
  conversation_id: "550e8400-e29b-41d4-a716-446655440002",
  type: "connection_note",
  content: { message: "Hi Marie!", hook: "INSEAD", char_count: 50 },
  status: "draft",
  version: 1,
  artifact_outcome: null,
  user_edit_distance: null,
  metadata: {},
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

// ---------------------------------------------------------------------------
// GET /api/artifacts
// ---------------------------------------------------------------------------

describe("GET /api/artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns paginated artifacts on success", async () => {
    const chain = makeQueryChain({ data: [mockArtifact], error: null, count: 1 });
    (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockArtifact],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/artifacts");
    const response = await getArtifacts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toBeInstanceOf(Array);
    expect(body.error).toBeNull();
  });

  it("filters by contact_id (valid UUID) when provided", async () => {
    const chain = makeQueryChain({ data: [mockArtifact], error: null, count: 1 });
    (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockArtifact],
      error: null,
      count: 1,
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest(
      "GET",
      `http://localhost/api/artifacts?contact_id=${mockArtifact.contact_id}`
    );
    const response = await getArtifacts(request);

    expect(response.status).toBe(200);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("GET", "http://localhost/api/artifacts");
    const response = await getArtifacts(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid artifact type filter", async () => {
    const request = makeRequest("GET", "http://localhost/api/artifacts?type=invalid_type");
    const response = await getArtifacts(request);

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/artifacts
// ---------------------------------------------------------------------------

describe("POST /api/artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("creates an artifact and returns 201", async () => {
    const contactChain = makeQueryChain({ data: { id: mockArtifact.contact_id }, error: null });
    const conversationChain = makeQueryChain({ data: { id: mockArtifact.conversation_id }, error: null });
    const insertChain = makeQueryChain({ data: mockArtifact, error: null });

    mockSupabase.from
      .mockReturnValueOnce(contactChain)
      .mockReturnValueOnce(conversationChain)
      .mockReturnValueOnce(insertChain);

    const request = makeRequest("POST", "http://localhost/api/artifacts", {
      contact_id: mockArtifact.contact_id,
      conversation_id: mockArtifact.conversation_id,
      type: "connection_note",
      content: { message: "Hi!", hook: "INSEAD", char_count: 20 },
    });

    const response = await postArtifact(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.type).toBe("connection_note");
  });

  it("returns 400 when required fields are missing", async () => {
    const request = makeRequest("POST", "http://localhost/api/artifacts", {
      type: "connection_note",
      content: {},
    });

    const response = await postArtifact(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid artifact type", async () => {
    const request = makeRequest("POST", "http://localhost/api/artifacts", {
      contact_id: "550e8400-e29b-41d4-a716-446655440000",
      conversation_id: "550e8400-e29b-41d4-a716-446655440001",
      type: "invalid_type",
      content: {},
    });

    const response = await postArtifact(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("POST", "http://localhost/api/artifacts", {
      contact_id: mockArtifact.contact_id,
      conversation_id: mockArtifact.conversation_id,
      type: "connection_note",
      content: {},
    });

    const response = await postArtifact(request);
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/artifacts/[id]
// ---------------------------------------------------------------------------

describe("GET /api/artifacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns artifact on success", async () => {
    const chain = makeQueryChain({ data: mockArtifact, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/artifacts/artifact-uuid-456");
    const response = await getArtifact(request, {
      params: Promise.resolve({ id: "artifact-uuid-456" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.type).toBe("connection_note");
  });

  it("returns 404 when artifact not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/artifacts/not-found");
    const response = await getArtifact(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/artifacts/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/artifacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("updates artifact status and returns 200", async () => {
    const updatedArtifact = { ...mockArtifact, status: "finalized" };

    // First: fetch current artifact
    const fetchChain = makeQueryChain({ data: mockArtifact, error: null });
    // Second: update artifact
    const updateChain = makeQueryChain({ data: updatedArtifact, error: null });

    mockSupabase.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    const request = makeRequest("PUT", "http://localhost/api/artifacts/artifact-uuid-456", {
      status: "finalized",
    });

    const response = await putArtifact(request, {
      params: Promise.resolve({ id: "artifact-uuid-456" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("finalized");
  });

  it("increments version when content is updated", async () => {
    const updatedContent = { message: "Updated message", hook: "INSEAD", char_count: 80 };
    const updatedArtifact = { ...mockArtifact, content: updatedContent, version: 2 };

    const fetchChain = makeQueryChain({ data: mockArtifact, error: null });
    const updateChain = makeQueryChain({ data: updatedArtifact, error: null });

    mockSupabase.from
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain);

    const request = makeRequest("PUT", "http://localhost/api/artifacts/artifact-uuid-456", {
      content: updatedContent,
    });

    const response = await putArtifact(request, {
      params: Promise.resolve({ id: "artifact-uuid-456" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.version).toBe(2);
  });

  it("returns 400 for invalid status value", async () => {
    const request = makeRequest("PUT", "http://localhost/api/artifacts/artifact-uuid-456", {
      status: "invalid_status",
    });

    const response = await putArtifact(request, {
      params: Promise.resolve({ id: "artifact-uuid-456" }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/artifacts/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/artifacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("deletes artifact and returns deleted: true", async () => {
    const existingChain = makeQueryChain({ data: { id: mockArtifact.id }, error: null });
    const deleteChain = makeQueryChain({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(deleteChain);

    const request = makeRequest("DELETE", "http://localhost/api/artifacts/artifact-uuid-456");
    const response = await deleteArtifact(request, {
      params: Promise.resolve({ id: "artifact-uuid-456" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when artifact not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("DELETE", "http://localhost/api/artifacts/not-found");
    const response = await deleteArtifact(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});
