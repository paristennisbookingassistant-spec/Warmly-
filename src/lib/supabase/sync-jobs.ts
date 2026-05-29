/**
 * lib/supabase/sync-jobs.ts
 * Typed CRUD helpers for the sync_jobs table.
 * All operations are scoped to the authenticated user via RLS.
 * Use these helpers from API route handlers — never raw SQL.
 */

import type { SupabaseServerClient } from "./server";
import type { SyncJob, SyncJobStatus, SyncJobPhase } from "@/types/database";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a new sync_job for the given user with initial state.
 * Returns the full record or throws on error.
 */
export async function createSyncJob(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SyncJob> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({
      user_id: userId,
      status: "pending" satisfies SyncJobStatus,
      phase: "list" satisfies SyncJobPhase,
      total_contacts: 0,
      processed_contacts: 0,
      last_completed_page: 0,
      last_processed_urn_index: 0,
      error: null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create sync_job: ${error?.message ?? "no data"}`);
  }

  return data as SyncJob;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches a single sync_job by ID, scoped to the user (RLS enforces ownership).
 * Returns null if not found or if the row belongs to a different user.
 */
export async function getSyncJob(
  supabase: SupabaseServerClient,
  jobId: string
): Promise<SyncJob | null> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    // PGRST116 = row not found — not an error we want to throw
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch sync_job: ${error.message}`);
  }

  return data as SyncJob;
}

/**
 * Returns the most recent in-progress or paused sync_job for a user.
 * Useful for checking whether a sync is already running before creating a new one.
 */
export async function getActiveSyncJob(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SyncJob | null> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "in_progress", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active sync_job: ${error.message}`);
  }

  return data as SyncJob | null;
}

/**
 * Returns the most recent sync_job for a user regardless of status.
 * Used by the Settings → Connections page to show "last sync" summary
 * (timestamp + total contacts) when nothing is currently running.
 * Returns null if the user has never synced.
 */
export async function getLatestSyncJob(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SyncJob | null> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest sync_job: ${error.message}`);
  }

  return data as SyncJob | null;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface UpdateSyncJobFields {
  status?: SyncJobStatus;
  phase?: SyncJobPhase;
  total_contacts?: number;
  processed_contacts?: number;
  last_completed_page?: number;
  last_processed_urn_index?: number;
  error?: string | null;
  completed_at?: string | null;
}

/**
 * Applies a partial update to a sync_job.
 * Only updates the supplied fields; all others remain unchanged.
 * RLS enforces that only the owning user can update.
 */
export async function updateSyncJob(
  supabase: SupabaseServerClient,
  jobId: string,
  fields: UpdateSyncJobFields
): Promise<SyncJob> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .update(fields)
    .eq("id", jobId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update sync_job: ${error?.message ?? "no data"}`);
  }

  return data as SyncJob;
}

/**
 * Atomically increments processed_contacts by `delta`.
 * Uses Postgres arithmetic to avoid read-modify-write races when multiple
 * batches from the same user arrive concurrently.
 */
export async function incrementProcessedContacts(
  supabase: SupabaseServerClient,
  jobId: string,
  delta: number
): Promise<void> {
  // Supabase JS client doesn't expose server-side arithmetic directly,
  // so we use a raw RPC-style update. The read-then-write here is safe
  // because bulk-import batches are serialised per sync_job at the
  // extension layer (single in-flight request at a time per job).
  const { error } = await supabase.rpc("increment_sync_job_processed", {
    p_job_id: jobId,
    p_delta: delta,
  });

  if (error) {
    // Non-fatal — log and continue. The count is informational only;
    // correctness of contact data is not affected.
    console.warn("increment_sync_job_processed RPC failed:", error.message);
  }
}
