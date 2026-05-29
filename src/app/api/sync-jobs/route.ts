/**
 * POST  /api/sync-jobs  — Create a new sync_job for the authenticated user
 * PATCH /api/sync-jobs  — Update an existing sync_job (by id in body)
 *
 * The extension service worker calls POST to open a new sync session, then
 * calls PATCH repeatedly to update status, phase, and progress counters as
 * work proceeds.
 *
 * Auth required. Validated with Zod.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSyncJob,
  updateSyncJob,
  getSyncJob,
  getLatestSyncJob,
} from "@/lib/supabase/sync-jobs";
import {
  unauthorized,
  validationError,
  notFound,
  badRequest,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type {
  CreateSyncJobResponse,
  PatchSyncJobResponse,
  GetLatestSyncJobResponse,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

// POST body is intentionally empty — server derives user_id from session
const CreateSyncJobSchema = z.object({}).strict();

const PatchSyncJobSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  status: z.enum(["pending", "in_progress", "paused", "completed", "failed"]).optional(),
  phase: z.enum(["list", "batch", "done"]).optional(),
  total_contacts: z.number().int().min(0).optional(),
  processed_contacts: z.number().int().min(0).optional(),
  last_completed_page: z.number().int().min(0).optional(),
  last_processed_urn_index: z.number().int().min(0).optional(),
  error: z.string().max(2000).nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// GET — fetch the latest sync_job for the authenticated user (any status)
//
// Used by the Settings → Connections page to display a "last sync"
// summary when no sync is currently running. Returns null in `data` if
// the user has never synced.
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  let latest;
  try {
    latest = await getLatestSyncJob(supabase, user.id);
  } catch (err) {
    console.error("sync-jobs GET error:", err);
    return internalError("Failed to fetch latest sync job");
  }

  const response: GetLatestSyncJobResponse = {
    data: latest,
    error: null,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// POST — create a new sync job
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Body is optional for POST (no required fields), but validate if present
  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    // Empty body is fine — treat as {}
  }

  const parsed = CreateSyncJobSchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  let syncJob;
  try {
    syncJob = await createSyncJob(supabase, user.id);
  } catch (err) {
    console.error("sync-jobs POST error:", err);
    return internalError("Failed to create sync job");
  }

  const response: CreateSyncJobResponse = {
    data: syncJob,
    error: null,
  };

  return NextResponse.json(response, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH — update an existing sync job
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: rawBody, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = PatchSyncJobSchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { id, ...fields } = parsed.data;

  // Ensure job exists and belongs to this user (RLS + explicit check)
  let existing;
  try {
    existing = await getSyncJob(supabase, id);
  } catch {
    return internalError("Failed to look up sync job");
  }

  if (!existing) {
    return notFound("Sync job");
  }

  // Guard: cannot update a completed or failed job status back to active
  if (
    (existing.status === "completed" || existing.status === "failed") &&
    fields.status &&
    fields.status !== existing.status
  ) {
    return badRequest(
      `Cannot update status of a ${existing.status} sync job. Create a new sync job.`
    );
  }

  // Build the update — omit undefined fields to prevent accidental nulling
  const updateFields: Record<string, unknown> = {};
  if (fields.status !== undefined) updateFields.status = fields.status;
  if (fields.phase !== undefined) updateFields.phase = fields.phase;
  if (fields.total_contacts !== undefined) updateFields.total_contacts = fields.total_contacts;
  if (fields.processed_contacts !== undefined) updateFields.processed_contacts = fields.processed_contacts;
  if (fields.last_completed_page !== undefined) updateFields.last_completed_page = fields.last_completed_page;
  if (fields.last_processed_urn_index !== undefined) updateFields.last_processed_urn_index = fields.last_processed_urn_index;
  if (fields.error !== undefined) updateFields.error = fields.error;
  if (fields.completed_at !== undefined) updateFields.completed_at = fields.completed_at;

  if (Object.keys(updateFields).length === 0) {
    return badRequest("No updatable fields provided");
  }

  let updated;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updated = await updateSyncJob(supabase, id, updateFields as any);
  } catch (err) {
    console.error("sync-jobs PATCH error:", err);
    return internalError("Failed to update sync job");
  }

  const response: PatchSyncJobResponse = {
    data: updated,
    error: null,
  };

  return NextResponse.json(response);
}
