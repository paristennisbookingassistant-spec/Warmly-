/**
 * tests/api/goals.test.ts
 * Tests for networking goals CRUD API routes.
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

vi.mock("@/lib/ai/minimax", () => ({
  callMiniMax: vi.fn(),
}));

const { GET: getGoals, POST: postGoal } = await import("@/app/api/goals/route");
const { GET: getGoal, PUT: putGoal, DELETE: deleteGoal } = await import(
  "@/app/api/goals/[id]/route"
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

const mockGoal = {
  id: "goal-uuid-1",
  user_id: "user-test-123",
  goal_type: "job_search",
  description: "Land an Associate role at a top PE firm by September 2026.",
  target_companies: ["Sequoia", "KKR"],
  target_roles: ["Associate"],
  target_contacts_per_month: 8,
  target_meetings_per_month: 4,
  progress: {
    contacts_found: 12,
    messages_sent: 5,
    meetings_held: 2,
    responses_received: 3,
  },
  status: "active",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

/** Sets up 4 count chains for progress computation */
function setupProgressChains() {
  for (let i = 0; i < 4; i++) {
    const countChain = makeQueryChain({ data: null, error: null, count: 0 });
    mockSupabase.from.mockReturnValueOnce(countChain);
  }
}

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------

describe("GET /api/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns goals list on success", async () => {
    // networking_goals select
    const goalsChain = makeQueryChain({ data: [mockGoal], error: null });
    (goalsChain.order as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockGoal],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(goalsChain);

    // 4 progress count queries
    setupProgressChains();

    const request = makeRequest("GET", "http://localhost/api/goals");
    const response = await getGoals(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toBeInstanceOf(Array);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("GET", "http://localhost/api/goals");
    const response = await getGoals(request);

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------

describe("POST /api/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("creates a goal and returns 201", async () => {
    const chain = makeQueryChain({ data: mockGoal, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("POST", "http://localhost/api/goals", {
      goal_type: "job_search",
      description: "Land a role at top PE/VC by September 2026",
      target_contacts_per_month: 8,
      target_meetings_per_month: 4,
    });

    const response = await postGoal(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.goal_type).toBe("job_search");
  });

  it("returns 400 when required fields are missing", async () => {
    const request = makeRequest("POST", "http://localhost/api/goals", {
      goal_type: "job_search",
      // missing description, target_contacts_per_month, target_meetings_per_month
    });

    const response = await postGoal(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid goal_type", async () => {
    const request = makeRequest("POST", "http://localhost/api/goals", {
      goal_type: "invalid_type",
      description: "Test",
      target_contacts_per_month: 5,
      target_meetings_per_month: 2,
    });

    const response = await postGoal(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/goals", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await postGoal(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("POST", "http://localhost/api/goals", {
      goal_type: "job_search",
      description: "Test",
      target_contacts_per_month: 5,
      target_meetings_per_month: 2,
    });

    const response = await postGoal(request);
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/goals/[id]
// ---------------------------------------------------------------------------

describe("GET /api/goals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("returns goal on success", async () => {
    const goalChain = makeQueryChain({ data: mockGoal, error: null });
    mockSupabase.from.mockReturnValueOnce(goalChain);
    setupProgressChains();

    const request = makeRequest("GET", "http://localhost/api/goals/goal-uuid-1");
    const response = await getGoal(request, {
      params: Promise.resolve({ id: "goal-uuid-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.goal_type).toBe("job_search");
  });

  it("returns 404 when goal not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("GET", "http://localhost/api/goals/not-found");
    const response = await getGoal(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/goals/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/goals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("updates goal and returns 200", async () => {
    const updatedGoal = { ...mockGoal, status: "achieved" };

    const existingChain = makeQueryChain({ data: { id: mockGoal.id }, error: null });
    const updateChain = makeQueryChain({ data: updatedGoal, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updateChain);

    setupProgressChains();

    const request = makeRequest("PUT", "http://localhost/api/goals/goal-uuid-1", {
      status: "achieved",
    });

    const response = await putGoal(request, {
      params: Promise.resolve({ id: "goal-uuid-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("achieved");
  });

  it("returns 400 for invalid status", async () => {
    const request = makeRequest("PUT", "http://localhost/api/goals/goal-uuid-1", {
      status: "invalid_status",
    });

    const response = await putGoal(request, {
      params: Promise.resolve({ id: "goal-uuid-1" }),
    });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/goals/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/goals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-test-123" } } });
  });

  it("deletes goal and returns deleted: true", async () => {
    const existingChain = makeQueryChain({ data: { id: mockGoal.id }, error: null });
    const deleteChain = makeQueryChain({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(deleteChain);

    const request = makeRequest("DELETE", "http://localhost/api/goals/goal-uuid-1");
    const response = await deleteGoal(request, {
      params: Promise.resolve({ id: "goal-uuid-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it("returns 404 when goal not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = makeRequest("DELETE", "http://localhost/api/goals/not-found");
    const response = await deleteGoal(request, {
      params: Promise.resolve({ id: "not-found" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeRequest("DELETE", "http://localhost/api/goals/goal-uuid-1");
    const response = await deleteGoal(request, {
      params: Promise.resolve({ id: "goal-uuid-1" }),
    });

    expect(response.status).toBe(401);
  });
});
