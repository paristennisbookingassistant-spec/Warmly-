/**
 * tests/api/bulk-import.test.ts
 * Tests for:
 *   POST /api/contacts/bulk-import
 *   POST /api/sync-jobs
 *   PATCH /api/sync-jobs
 *   GET  /api/sync-jobs/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeQueryChain, makeSupabaseMock } from "../helpers/supabase-mock";

// ---------------------------------------------------------------------------
// Mocks — must be set up before any dynamic imports
// ---------------------------------------------------------------------------

const mockSupabase = makeSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import route handlers after mocks are registered
const { POST: bulkImport } = await import("@/app/api/contacts/bulk-import/route");
const { POST: createSyncJobRoute, PATCH: patchSyncJobRoute } = await import(
  "@/app/api/sync-jobs/route"
);
const { GET: getSyncJobRoute } = await import("@/app/api/sync-jobs/[id]/route");

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validSyncJob = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  user_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  status: "in_progress",
  phase: "list",
  total_contacts: 100,
  processed_contacts: 0,
  last_completed_page: 0,
  last_processed_urn_index: 0,
  error: null,
  started_at: "2026-05-29T10:00:00Z",
  updated_at: "2026-05-29T10:00:00Z",
  completed_at: null,
};

const validBatchItem = {
  linkedinUrl: "https://www.linkedin.com/in/test-person",
  linkedinUrn: "urn:li:fsd_profile:ACoAAA12345",
  name: "Test Person",
  headline: "VP of Engineering",
  photoUrl: "https://media.licdn.com/photo.jpg",
  currentCompany: "Acme Corp",
  currentTitle: "VP of Engineering",
};

function makeBulkImportRequest(body: unknown): NextRequest {
  return new NextRequest(
    new Request("http://localhost/api/contacts/bulk-import", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );
}

// ---------------------------------------------------------------------------
// POST /api/contacts/bulk-import
// ---------------------------------------------------------------------------

describe("POST /api/contacts/bulk-import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-test-123" } },
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/contacts/bulk-import", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await bulkImport(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when syncJobId is missing", async () => {
    const request = makeBulkImportRequest({
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when syncJobId is not a valid UUID", async () => {
    const request = makeBulkImportRequest({
      syncJobId: "not-a-uuid",
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when phase is invalid", async () => {
    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "invalid_phase",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when batch is empty", async () => {
    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: [],
    });

    const response = await bulkImport(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when batch exceeds 50 items", async () => {
    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: Array.from({ length: 51 }, (_, i) => ({
        ...validBatchItem,
        linkedinUrn: `urn:li:fsd_profile:ACoAAA${i}`,
        linkedinUrl: `https://www.linkedin.com/in/test-person-${i}`,
      })),
    });

    const response = await bulkImport(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when sync job does not exist", async () => {
    const notFoundChain = makeQueryChain({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    mockSupabase.from.mockReturnValue(notFoundChain);

    const request = makeBulkImportRequest({
      syncJobId: "00000000-0000-0000-0000-000000000000",
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    expect(response.status).toBe(404);
  });

  it("returns 400 when syncing into a completed job", async () => {
    const completedJob = { ...validSyncJob, status: "completed" };
    const jobChain = makeQueryChain({ data: completedJob, error: null });
    mockSupabase.from.mockReturnValue(jobChain);

    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 200 with inserted count when contact is new (Phase 1)", async () => {
    // getSyncJob -> single()
    const syncJobChain = makeQueryChain({ data: validSyncJob, error: null });
    // existing contact check -> maybeSingle() -> null (new)
    const existingCheckChain = makeQueryChain({ data: null, error: null });
    // upsert
    const upsertChain = makeQueryChain({ data: null, error: null });
    // updateSyncJob -> single()
    const updateJobChain = makeQueryChain({
      data: { ...validSyncJob, processed_contacts: 1 },
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(syncJobChain)
      .mockReturnValueOnce(existingCheckChain)
      .mockReturnValueOnce(upsertChain)
      .mockReturnValueOnce(updateJobChain);

    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.inserted).toBe(1);
    expect(body.data.updated).toBe(0);
    expect(body.data.errors).toHaveLength(0);
  });

  it("returns 200 with updated count when contact already exists (Phase 1)", async () => {
    const syncJobChain = makeQueryChain({ data: validSyncJob, error: null });
    const existingChain = makeQueryChain({ data: { id: "existing-contact-id" }, error: null });
    const upsertChain = makeQueryChain({ data: null, error: null });
    const updateJobChain = makeQueryChain({
      data: { ...validSyncJob, processed_contacts: 1 },
      error: null,
    });

    mockSupabase.from
      .mockReturnValueOnce(syncJobChain)
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(upsertChain)
      .mockReturnValueOnce(updateJobChain);

    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "list",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.inserted).toBe(0);
    expect(body.data.updated).toBe(1);
    expect(body.data.errors).toHaveLength(0);
  });

  it("collects per-item errors without failing the batch", async () => {
    const syncJobChain = makeQueryChain({ data: validSyncJob, error: null });
    const existingChain = makeQueryChain({ data: null, error: null });
    // upsert fails
    const upsertChain = makeQueryChain({ data: null, error: { message: "DB constraint error" } });
    const updateJobChain = makeQueryChain({ data: validSyncJob, error: null });

    mockSupabase.from
      .mockReturnValueOnce(syncJobChain)
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(upsertChain)
      .mockReturnValue(updateJobChain);

    const request = makeBulkImportRequest({
      syncJobId: validSyncJob.id,
      phase: "batch",
      batch: [validBatchItem],
    });

    const response = await bulkImport(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.inserted).toBe(0);
    expect(body.data.updated).toBe(0);
    expect(body.data.errors).toHaveLength(1);
    expect(body.data.errors[0].linkedinUrn).toBe(validBatchItem.linkedinUrn);
  });
});

// ---------------------------------------------------------------------------
// POST /api/sync-jobs
// ---------------------------------------------------------------------------

describe("POST /api/sync-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-test-123" } },
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", { method: "POST" })
    );

    const response = await createSyncJobRoute(request);
    expect(response.status).toBe(401);
  });

  it("creates a sync job and returns 201", async () => {
    const chain = makeQueryChain({ data: validSyncJob, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await createSyncJobRoute(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(validSyncJob.id);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/sync-jobs
// ---------------------------------------------------------------------------

describe("PATCH /api/sync-jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-test-123" } },
    });
  });

  it("returns 400 when id is missing", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await patchSyncJobRoute(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when sync job not found", async () => {
    const chain = makeQueryChain({ data: null, error: { code: "PGRST116", message: "not found" } });
    mockSupabase.from.mockReturnValue(chain);

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", {
        method: "PATCH",
        body: JSON.stringify({
          id: "00000000-0000-0000-0000-000000000000",
          status: "completed",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await patchSyncJobRoute(request);
    expect(response.status).toBe(404);
  });

  it("updates status and returns 200", async () => {
    const updatedJob = {
      ...validSyncJob,
      status: "completed",
      completed_at: "2026-05-29T11:00:00Z",
    };

    const getChain = makeQueryChain({ data: validSyncJob, error: null });
    const updateChain = makeQueryChain({ data: updatedJob, error: null });

    mockSupabase.from
      .mockReturnValueOnce(getChain)
      .mockReturnValueOnce(updateChain);

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", {
        method: "PATCH",
        body: JSON.stringify({
          id: validSyncJob.id,
          status: "completed",
          completed_at: "2026-05-29T11:00:00Z",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await patchSyncJobRoute(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.status).toBe("completed");
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const getChain = makeQueryChain({ data: validSyncJob, error: null });
    mockSupabase.from.mockReturnValue(getChain);

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs", {
        method: "PATCH",
        body: JSON.stringify({ id: validSyncJob.id }),
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await patchSyncJobRoute(request);
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/sync-jobs/[id]
// ---------------------------------------------------------------------------

describe("GET /api/sync-jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-test-123" } },
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const request = new NextRequest(
      new Request(`http://localhost/api/sync-jobs/${validSyncJob.id}`)
    );

    const response = await getSyncJobRoute(request, {
      params: Promise.resolve({ id: validSyncJob.id }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID path parameter", async () => {
    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs/not-a-uuid")
    );

    const response = await getSyncJobRoute(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when sync job not found", async () => {
    const chain = makeQueryChain({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    mockSupabase.from.mockReturnValue(chain);

    const request = new NextRequest(
      new Request("http://localhost/api/sync-jobs/00000000-0000-0000-0000-000000000000")
    );

    const response = await getSyncJobRoute(request, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 200 with sync job data", async () => {
    const chain = makeQueryChain({ data: validSyncJob, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const request = new NextRequest(
      new Request(`http://localhost/api/sync-jobs/${validSyncJob.id}`)
    );

    const response = await getSyncJobRoute(request, {
      params: Promise.resolve({ id: validSyncJob.id }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(validSyncJob.id);
    expect(body.data.status).toBe("in_progress");
    expect(body.data.phase).toBe("list");
  });
});
