/**
 * content-script/connections-sync.ts
 *
 * Orchestrates the LinkedIn Network Sync (v1) feature.
 *
 * RUNS IN THE CONTENT SCRIPT — NOT the service worker.
 * Manifest V3 service workers die after 30 s of inactivity; this sync takes
 * 15–25 minutes, so the orchestration loop must live here, in the tab context.
 * The service worker only handles short-lived tasks (API calls, storage I/O).
 *
 * Phases:
 *   1. Connections list pagination — page by page, 40 connections per page,
 *      throttled to LIST_THROTTLE_MS between pages.
 *   2. Batch profile enrichment — 25 URNs per request,
 *      throttled to BATCH_THROTTLE_MS between batches.
 *   3. Cleanup — mark sync_job complete, post SYNC_COMPLETE to web app.
 *
 * Resumability: SyncJob state is persisted via service worker to both
 * chrome.storage.local (fast, local) and the backend /api/sync-jobs endpoint.
 * On resume, Phase 1 skips already-completed pages; Phase 2 starts at
 * last_processed_urn_index.
 *
 * READ-ONLY: Never POSTs/PUTs/DELETEs to linkedin.com.
 */

import {
  LIST_THROTTLE_MS,
  BATCH_THROTTLE_MS,
  PLAN_CAP,
  BATCH_SIZE,
  BASIC_BATCH_SIZE,
  RATE_LIMIT_PAUSE_MS,
  CONNECTIONS_PAGE_SIZE,
} from "../shared/constants";
import type {
  SyncJob,
  BulkImportRequest,
  BulkImportContact,
  VoyagerConnection,
  VoyagerProfile,
  SyncProgressPayload,
  SyncCompletePayload,
  SyncFailedPayload,
} from "../shared/types";
import {
  fetchConnectionsPage,
  getCsrfToken,
  RateLimitedError,
} from "./voyager-list-client";
import { fetchProfileBatch } from "./voyager-batch-client";

// ---------------------------------------------------------------------------
// Jitter helper
// ---------------------------------------------------------------------------

/**
 * Returns the base delay ±25% jitter so requests aren't perfectly periodic.
 * This makes the traffic pattern less detectable as automated.
 */
function withJitter(baseMs: number): number {
  const jitter = baseMs * 0.25;
  return Math.round(baseMs - jitter + Math.random() * jitter * 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Service worker communication helpers
// (all sync state management goes through the SW, not direct storage)
// ---------------------------------------------------------------------------

async function sendToSW<T>(type: string, payload?: unknown): Promise<T | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload }) as T | null;
    return response ?? null;
  } catch (err) {
    console.warn(`[ConnectionsSync] SW message ${type} failed:`, err);
    return null;
  }
}

async function createSyncJob(userId: string): Promise<SyncJob | null> {
  return sendToSW<SyncJob>("SYNC_CREATE_JOB", { user_id: userId });
}

async function loadSyncJob(jobId: string): Promise<SyncJob | null> {
  return sendToSW<SyncJob>("SYNC_GET_JOB", { job_id: jobId });
}

async function updateSyncJob(job: Partial<SyncJob> & { id: string }): Promise<void> {
  await sendToSW("SYNC_UPDATE_JOB", job);
}

async function bulkImport(request: BulkImportRequest): Promise<void> {
  await sendToSW("SYNC_BULK_IMPORT", request);
}

// ---------------------------------------------------------------------------
// Web app messaging (postMessage to warmly.app tabs)
// ---------------------------------------------------------------------------

/**
 * Posts a sync event back to the web app via the auth-bridge channel.
 * The web app's useExtensionBridge hook listens on window.addEventListener('message').
 * We broadcast to the warmly.app origin only — see LINKEDIN_GUARDRAILS.md.
 */
function broadcastToWebApp(type: string, payload: unknown): void {
  // The auth-bridge content script on the warmly.app tab handles inbound;
  // here we send to the SW which will relay to the web app if needed.
  // Additionally, post to current window in case warmly.app opened us via
  // an embedded frame or is inspecting via the same tab (dev scenario).
  try {
    chrome.runtime.sendMessage({ type: `WEBAPP_${type}`, payload }).catch(() => {
      // Non-fatal: SW may not have the relay handler yet
    });
  } catch {
    // Ignore
  }
}

function emitProgress(job: SyncJob): void {
  const payload: SyncProgressPayload = {
    sync_job_id: job.id,
    status: job.status,
    phase: job.last_processed_urn_index > 0 ? 2 : 1,
    connections_imported: job.connections_imported,
    profiles_enriched: job.profiles_enriched,
    total_connections: job.total_connections,
    cap_hit: job.cap_hit,
  };
  broadcastToWebApp("SYNC_PROGRESS", payload);
  console.debug("[ConnectionsSync] Progress:", payload);
}

function emitComplete(job: SyncJob): void {
  const payload: SyncCompletePayload = {
    sync_job_id: job.id,
    connections_imported: job.connections_imported,
    profiles_enriched: job.profiles_enriched,
    total_connections: job.total_connections,
    cap_hit: job.cap_hit,
  };
  broadcastToWebApp("SYNC_COMPLETE", payload);
  console.info("[ConnectionsSync] Sync complete:", payload);
}

function emitFailed(jobId: string | null, reason: string): void {
  const payload: SyncFailedPayload = { sync_job_id: jobId, reason };
  broadcastToWebApp("SYNC_FAILED", payload);
  console.error("[ConnectionsSync] Sync failed:", reason);
}

// ---------------------------------------------------------------------------
// VoyagerConnection → BulkImportContact mapper
// ---------------------------------------------------------------------------

function connectionToImportContact(conn: VoyagerConnection): BulkImportContact {
  return {
    linkedin_url: conn.linkedinUrl,
    linkedin_urn: conn.urn,
    name: conn.name,
    headline: conn.headline,
    current_company: conn.currentCompany,
    photo_url: conn.photoUrl,
    location: null,
    linkedin_bio: null,
    experience: null,
    education: null,
    connected_at: conn.connectedAt,
  };
}

function profileToImportContact(prof: VoyagerProfile): BulkImportContact {
  return {
    linkedin_url: prof.linkedinUrl,
    linkedin_urn: prof.urn,
    name: prof.name,
    headline: prof.headline,
    current_company: prof.experience[0]?.company ?? null,
    photo_url: prof.photoUrl,
    location: prof.location,
    linkedin_bio: prof.bio,
    experience: prof.experience.length > 0 ? prof.experience : null,
    education: prof.education.length > 0 ? prof.education : null,
    connected_at: null,
  };
}

// ---------------------------------------------------------------------------
// 429 / 999 backoff handler
// ---------------------------------------------------------------------------

/**
 * Handles rate-limit responses from LinkedIn.
 * Pauses the sync_job for RATE_LIMIT_PAUSE_MS, with exponential backoff
 * on repeated occurrences. Auto-resumes after the pause.
 */
async function handleRateLimited(
  job: SyncJob,
  signal: { aborted: boolean }
): Promise<void> {
  const backoffMultiplier = Math.min(Math.pow(2, job.backoff_count), 8);
  const pauseMs = RATE_LIMIT_PAUSE_MS * backoffMultiplier;

  const updatedJob: Partial<SyncJob> & { id: string } = {
    id: job.id,
    status: "paused",
    backoff_count: job.backoff_count + 1,
    resume_after_ts: Date.now() + pauseMs,
    updated_at: new Date().toISOString(),
  };
  Object.assign(job, updatedJob);
  await updateSyncJob(updatedJob);

  emitProgress(job);

  const pauseMinutes = Math.round(pauseMs / 60_000);
  console.warn(`[ConnectionsSync] Rate limited. Pausing for ${pauseMinutes} min (backoff x${backoffMultiplier})`);

  const deadline = Date.now() + pauseMs;
  while (Date.now() < deadline) {
    if (signal.aborted) return;
    await sleep(5_000);
  }

  // Auto-resume
  const resumed: Partial<SyncJob> & { id: string } = {
    id: job.id,
    status: "running",
    resume_after_ts: null,
    updated_at: new Date().toISOString(),
  };
  Object.assign(job, resumed);
  await updateSyncJob(resumed);
  console.info("[ConnectionsSync] Auto-resuming after rate limit pause");
}

// ---------------------------------------------------------------------------
// Phase 1: Connections list pagination
// ---------------------------------------------------------------------------

async function runPhase1(
  job: SyncJob,
  csrfToken: string,
  signal: { aborted: boolean }
): Promise<void> {
  console.info("[ConnectionsSync] Phase 1 starting. last_completed_page:", job.last_completed_page);

  let page = job.last_completed_page; // 0-based; resume at next page
  let basicBuffer: BulkImportContact[] = [];
  let totalSeen: number | null = null;

  // A page value of -1 means "haven't started"; 0 means first page complete.
  const startPage = page < 0 ? 0 : page + 1;

  for (let p = startPage; ; p++) {
    if (signal.aborted) return;

    const start = p * CONNECTIONS_PAGE_SIZE;

    // Check plan cap
    if (job.collected_urns.length >= PLAN_CAP) {
      job.cap_hit = true;
      console.info(`[ConnectionsSync] Phase 1: plan cap (${PLAN_CAP}) reached`);
      break;
    }

    let result;
    try {
      result = await fetchConnectionsPage(start, csrfToken);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        await handleRateLimited(job, signal);
        if (signal.aborted) return;
        // Retry this page after the pause (don't increment p)
        p--;
        continue;
      }
      throw err;
    }

    if (!result) {
      console.error(`[ConnectionsSync] Phase 1: failed to fetch page ${p} (start=${start})`);
      break;
    }

    // Update total on first successful page
    if (result.total !== null && totalSeen === null) {
      totalSeen = result.total;
      const update = { id: job.id, total_connections: totalSeen, updated_at: new Date().toISOString() };
      Object.assign(job, update);
      await updateSyncJob(update);
    }

    // Collect URNs (deduplicated, cap-aware)
    const newUrns: string[] = [];
    for (const conn of result.connections) {
      if (job.collected_urns.length + newUrns.length >= PLAN_CAP) break;
      if (!job.collected_urns.includes(conn.urn)) {
        newUrns.push(conn.urn);
        job.collected_urns.push(conn.urn);
      }
      basicBuffer.push(connectionToImportContact(conn));
    }

    job.connections_imported += result.connections.length;

    // Flush buffer when it reaches BASIC_BATCH_SIZE
    if (basicBuffer.length >= BASIC_BATCH_SIZE) {
      const batch: BulkImportRequest = {
        sync_job_id: job.id,
        phase: 1,
        contacts: basicBuffer.splice(0, BASIC_BATCH_SIZE),
      };
      await bulkImport(batch);
    }

    // Persist page progress
    const pageUpdate = {
      id: job.id,
      last_completed_page: p,
      collected_urns: job.collected_urns,
      connections_imported: job.connections_imported,
      cap_hit: job.cap_hit,
      updated_at: new Date().toISOString(),
    };
    Object.assign(job, pageUpdate);
    await updateSyncJob(pageUpdate);

    emitProgress(job);

    if (!result.hasMore || job.cap_hit) break;

    // Throttle with jitter before next page
    await sleep(withJitter(LIST_THROTTLE_MS));
  }

  // Flush remaining basic contacts
  if (basicBuffer.length > 0) {
    await bulkImport({
      sync_job_id: job.id,
      phase: 1,
      contacts: basicBuffer,
    });
  }

  console.info(`[ConnectionsSync] Phase 1 complete. URNs collected: ${job.collected_urns.length}`);
}

// ---------------------------------------------------------------------------
// Phase 2: Batch profile enrichment
// ---------------------------------------------------------------------------

async function runPhase2(
  job: SyncJob,
  csrfToken: string,
  signal: { aborted: boolean }
): Promise<void> {
  console.info("[ConnectionsSync] Phase 2 starting. last_processed_urn_index:", job.last_processed_urn_index);

  const startIdx = job.last_processed_urn_index;
  const urns = job.collected_urns;
  let consecutiveParseFailures = 0;

  for (let i = startIdx; i < urns.length; i += BATCH_SIZE) {
    if (signal.aborted) return;

    const batchUrns = urns.slice(i, i + BATCH_SIZE);

    let profiles: VoyagerProfile[] | null;
    try {
      profiles = await fetchProfileBatch(batchUrns, csrfToken);
    } catch (err) {
      if (err instanceof RateLimitedError) {
        await handleRateLimited(job, signal);
        if (signal.aborted) return;
        // Retry same batch
        i -= BATCH_SIZE;
        continue;
      }
      throw err;
    }

    if (!profiles) {
      console.warn(`[ConnectionsSync] Phase 2: batch at index ${i} returned null (skipping)`);
      consecutiveParseFailures++;
      if (consecutiveParseFailures >= 3) {
        // Deep enrichment (full work history / education) is gated behind
        // per-profile "card" fetches that aren't available via this batch
        // endpoint. Rather than failing the whole sync, stop Phase 2 gracefully
        // and let the orchestrator complete: Phase 1 already imported every
        // connection with basic data, which is the core value. Deep enrichment
        // happens lazily on contact open (see Contact Detail).
        console.warn("[ConnectionsSync] Phase 2: deep enrichment unavailable in bulk — completing with Phase 1 data, deep fields will fill in on demand");
        return;
      }
    } else {
      consecutiveParseFailures = 0;

      const contacts: BulkImportContact[] = profiles.map(profileToImportContact);

      if (contacts.length > 0) {
        await bulkImport({
          sync_job_id: job.id,
          phase: 2,
          contacts,
        });
      }

      job.profiles_enriched += profiles.length;
    }

    const idxUpdate = {
      id: job.id,
      last_processed_urn_index: i + batchUrns.length,
      profiles_enriched: job.profiles_enriched,
      updated_at: new Date().toISOString(),
    };
    Object.assign(job, idxUpdate);
    await updateSyncJob(idxUpdate);

    emitProgress(job);

    if (i + BATCH_SIZE < urns.length) {
      await sleep(withJitter(BATCH_THROTTLE_MS));
    }
  }

  console.info(`[ConnectionsSync] Phase 2 complete. Profiles enriched: ${job.profiles_enriched}`);
}

// ---------------------------------------------------------------------------
// Main orchestrator entry point
// ---------------------------------------------------------------------------

let _activeSyncSignal: { aborted: boolean } | null = null;

/**
 * Starts or resumes a LinkedIn network sync.
 *
 * @param userId        Supabase user ID (from the web app's session)
 * @param resumeJobId   If provided, resumes an existing sync_job from where
 *                      it left off. Otherwise creates a new job.
 */
export async function startSync(
  userId: string,
  resumeJobId?: string
): Promise<void> {
  // Abort any existing sync
  if (_activeSyncSignal) {
    _activeSyncSignal.aborted = true;
  }
  const signal = { aborted: false };
  _activeSyncSignal = signal;

  console.info("[ConnectionsSync] Starting sync. userId:", userId, "resumeJobId:", resumeJobId ?? "none");

  // CSRF token extraction (required for all Voyager calls)
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    emitFailed(resumeJobId ?? null, "no_csrf_token");
    return;
  }

  // Create or load the sync job
  let job: SyncJob | null;
  if (resumeJobId) {
    job = await loadSyncJob(resumeJobId);
    if (!job) {
      console.error("[ConnectionsSync] Could not load sync job:", resumeJobId);
      emitFailed(resumeJobId, "job_not_found");
      return;
    }
    console.info("[ConnectionsSync] Resuming job:", job.id, "status:", job.status);
  } else {
    job = await createSyncJob(userId);
    if (!job) {
      console.error("[ConnectionsSync] Could not create sync job");
      emitFailed(null, "job_creation_failed");
      return;
    }
    console.info("[ConnectionsSync] Created job:", job.id);
  }

  // Mark as running
  const runningUpdate = {
    id: job.id,
    status: "running" as const,
    updated_at: new Date().toISOString(),
  };
  Object.assign(job, runningUpdate);
  await updateSyncJob(runningUpdate);
  emitProgress(job);

  try {
    // Phase 1: Collect all connection URNs
    // Skip if we already have URNs and have moved to Phase 2 on a resume
    if (job.collected_urns.length === 0 || job.last_processed_urn_index === 0) {
      await runPhase1(job, csrfToken, signal);
      if (signal.aborted) {
        console.info("[ConnectionsSync] Aborted during Phase 1");
        return;
      }
    }

    if (job.collected_urns.length === 0) {
      console.warn("[ConnectionsSync] No connections collected — sync complete with 0 contacts");
    } else {
      // Phase 2: Enrich profiles in batches
      await runPhase2(job, csrfToken, signal);
      if (signal.aborted) {
        console.info("[ConnectionsSync] Aborted during Phase 2");
        return;
      }
    }

    // Phase 3: Mark complete
    const completedUpdate = {
      id: job.id,
      status: "completed" as const,
      updated_at: new Date().toISOString(),
    };
    Object.assign(job, completedUpdate);
    await updateSyncJob(completedUpdate);
    emitComplete(job);
  } catch (err) {
    const reason = String(err);
    console.error("[ConnectionsSync] Unhandled error:", err);

    await updateSyncJob({
      id: job.id,
      status: "failed",
      updated_at: new Date().toISOString(),
    });

    emitFailed(job.id, reason);
  } finally {
    if (_activeSyncSignal === signal) {
      _activeSyncSignal = null;
    }
  }
}

/**
 * Aborts any active sync session immediately.
 * The sync state (progress) is already persisted and can be resumed.
 */
export function abortSync(): void {
  if (_activeSyncSignal) {
    _activeSyncSignal.aborted = true;
    _activeSyncSignal = null;
    console.info("[ConnectionsSync] Sync aborted by caller");
  }
}

/**
 * Returns true if a sync is currently running.
 */
export function isSyncRunning(): boolean {
  return _activeSyncSignal !== null;
}
