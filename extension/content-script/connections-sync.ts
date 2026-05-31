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
  PROFILE_FETCH_THROTTLE_MS,
  PLAN_CAP,
  BASIC_BATCH_SIZE,
  RATE_LIMIT_PAUSE_MS,
  CONNECTIONS_PAGE_SIZE,
} from "../shared/constants";
import type {
  SyncJob,
  BulkImportRequest,
  BulkImportContact,
  VoyagerConnection,
  SyncProgressPayload,
  SyncCompletePayload,
  SyncFailedPayload,
} from "../shared/types";
import {
  fetchConnectionsPage,
  getCsrfToken,
  RateLimitedError,
} from "./voyager-list-client";
import { fetchExperience, fetchEducation, profileIdFromUrn } from "./rsc-profile-client";

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

/**
 * Returns the base delay ±30% jitter, used for per-profile RSC fetches
 * (Phase 2) where the spec requires ±30% randomization.
 * Minimum effective delay: 10,500 ms (15,000 * 0.70).
 */
function withJitter30(baseMs: number): number {
  const jitter = baseMs * 0.30;
  return Math.round(baseMs - jitter + Math.random() * jitter * 2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Test-only profile cap
// ---------------------------------------------------------------------------
// Lets a bounded test sync run (e.g. 50 contacts) through the REAL pipeline so
// timing + correctness can be measured without the full ~2,500 crawl. Read from
// chrome.storage.local key "warmly_sync_test_max". Production never sets this
// key, so the effective cap stays at PLAN_CAP for real users.
let _testMaxProfiles = 0;

async function loadTestMaxProfiles(): Promise<void> {
  try {
    const r = await chrome.storage.local.get("warmly_sync_test_max");
    const v = Number(r["warmly_sync_test_max"]);
    _testMaxProfiles = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
    if (_testMaxProfiles > 0) {
      console.warn(`[ConnectionsSync] TEST cap active: ${_testMaxProfiles} contacts`);
    }
  } catch {
    _testMaxProfiles = 0;
  }
}

/** Effective collection/enrichment cap (test cap if set, else the plan cap). */
function profileCap(): number {
  return _testMaxProfiles > 0 ? Math.min(_testMaxProfiles, PLAN_CAP) : PLAN_CAP;
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
  const cap = profileCap();

  for (let p = startPage; ; p++) {
    if (signal.aborted) return;

    const start = p * CONNECTIONS_PAGE_SIZE;

    // Check plan cap (or test cap)
    if (job.collected_urns.length >= cap) {
      job.cap_hit = true;
      console.info(`[ConnectionsSync] Phase 1: cap (${cap}) reached`);
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

    // Collect URNs + profiles (deduplicated, cap-aware)
    // collected_profiles carries publicId alongside each URN so Phase 2 can
    // build the details-page URL without a second lookup.
    const newUrns: string[] = [];
    for (const conn of result.connections) {
      if (job.collected_urns.length + newUrns.length >= cap) break;
      if (!job.collected_urns.includes(conn.urn)) {
        newUrns.push(conn.urn);
        job.collected_urns.push(conn.urn);
        // Ensure collected_profiles is initialised on resumed jobs from before
        // this field existed.
        if (!Array.isArray(job.collected_profiles)) {
          job.collected_profiles = [];
        }
        job.collected_profiles.push({ urn: conn.urn, publicId: conn.publicId });
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

    // Persist page progress — include collected_profiles so Phase 2 has publicIds
    const pageUpdate = {
      id: job.id,
      last_completed_page: p,
      collected_urns: job.collected_urns,
      collected_profiles: job.collected_profiles,
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
// Phase 2: Per-profile RSC deep enrichment
// ---------------------------------------------------------------------------

/**
 * Builds a BulkImportContact for a Phase 2 RSC enrichment update.
 * The URN + URL identify the contact to update; experience + education are
 * the new deep-enrichment fields.
 */
function buildEnrichmentContact(
  urn: string,
  linkedinUrl: string,
  name: string,
  experience: BulkImportContact["experience"],
  education: BulkImportContact["education"]
): BulkImportContact {
  // Most-recent role (experience is returned most-recent-first) fills the
  // contact's current company + title — the contact card's "who is this".
  const top = experience?.[0];
  return {
    linkedin_url: linkedinUrl,
    linkedin_urn: urn,
    name,
    headline: null,
    current_company: top?.company ?? null,
    current_title: top?.title ?? null,
    photo_url: null,
    location: top?.location ?? null,
    linkedin_bio: null,
    experience,
    education,
    connected_at: null,
  };
}

/**
 * Phase 2 (RSC path): iterates over every collected profile and fetches
 * experience + education from the LinkedIn details sub-pages.
 *
 * Design:
 * - Iterates per-profile (not per-batch-of-25) to stay within RSC fetch limits.
 * - Throttled PROFILE_FETCH_THROTTLE_MS (±30% jitter) between profiles.
 * - Resumable via last_processed_urn_index.
 * - Profiles with no publicId are skipped (can't build the details URL).
 * - Parse failures return [] — partial data is fine, sync still completes.
 * - On 429/999: delegates to handleRateLimited, then retries the same profile.
 *
 * READ-ONLY: only GET requests to linkedin.com.
 */
async function runPhase2(
  job: SyncJob,
  csrfToken: string,
  signal: { aborted: boolean }
): Promise<void> {
  console.info(
    "[ConnectionsSync] Phase 2 (RSC) starting. last_processed_urn_index:",
    job.last_processed_urn_index
  );

  // Ensure collected_profiles exists — older resumed jobs may have only collected_urns.
  // In that case we can't do RSC enrichment (no publicIds). Degrade gracefully.
  if (!Array.isArray(job.collected_profiles) || job.collected_profiles.length === 0) {
    console.warn(
      "[ConnectionsSync] Phase 2: no collected_profiles (old job format or empty sync). " +
      "Skipping RSC enrichment — Phase 1 data is complete."
    );
    return;
  }

  const profiles = job.collected_profiles;
  const startIdx = job.last_processed_urn_index;
  // Honour the test cap (else enrich everything collected).
  const limit = _testMaxProfiles > 0 ? Math.min(profiles.length, _testMaxProfiles) : profiles.length;
  let skipped = 0;

  for (let i = startIdx; i < limit; i++) {
    if (signal.aborted) return;

    const profile = profiles[i]!;
    const { urn, publicId } = profile;
    const profileId = profileIdFromUrn(urn);

    if (!publicId) {
      console.debug(`[ConnectionsSync] Phase 2: skipping URN ${urn} — no publicId`);
      skipped++;
      // Still advance the index so resume is correct
      const skipUpdate = {
        id: job.id,
        last_processed_urn_index: i + 1,
        updated_at: new Date().toISOString(),
      };
      Object.assign(job, skipUpdate);
      await updateSyncJob(skipUpdate);
      continue;
    }

    // Fetch experience + education for this profile (both back-to-back, then throttle)
    let experience: BulkImportContact["experience"] = null;
    let education: BulkImportContact["education"] = null;

    // Experience fetch
    let retryExp = true;
    while (retryExp) {
      try {
        const exp = await fetchExperience(publicId, profileId, csrfToken);
        experience = exp.length > 0 ? exp : null;
        retryExp = false;
      } catch (err) {
        if (err instanceof RateLimitedError) {
          await handleRateLimited(job, signal);
          if (signal.aborted) return;
          // Retry same profile
        } else {
          console.warn(`[ConnectionsSync] Phase 2: experience fetch error for ${publicId}:`, err);
          retryExp = false;
        }
      }
    }

    if (signal.aborted) return;

    // Education fetch (no extra throttle between exp + edu — same profile, back-to-back)
    let retryEdu = true;
    while (retryEdu) {
      try {
        const edu = await fetchEducation(publicId, profileId, csrfToken);
        education = edu.length > 0 ? edu : null;
        retryEdu = false;
      } catch (err) {
        if (err instanceof RateLimitedError) {
          await handleRateLimited(job, signal);
          if (signal.aborted) return;
          // Retry same profile education
        } else {
          console.warn(`[ConnectionsSync] Phase 2: education fetch error for ${publicId}:`, err);
          retryEdu = false;
        }
      }
    }

    // Build and send the enrichment contact.
    // We need the linkedin_url to match the backend contact record.
    // Derive it from publicId (matches what Phase 1 stored).
    const linkedinUrl = `https://www.linkedin.com/in/${publicId}/`;

    // name is required by bulkImportContacts — use a placeholder that the backend
    // will upsert-merge with the existing contact (which already has the real name).
    // The backend bulk-import does an upsert on linkedin_url + user_id, merging
    // only non-null fields, so a placeholder name won't overwrite the real one
    // as long as the backend logic is correct. If the backend requires a real name,
    // we pass publicId as a fallback (better than failing).
    const name = publicId; // fallback — real name is already stored from Phase 1

    const contact = buildEnrichmentContact(urn, linkedinUrl, name, experience, education);

    if (experience !== null || education !== null) {
      await bulkImport({
        sync_job_id: job.id,
        phase: 2,
        contacts: [contact],
      });
      job.profiles_enriched++;
    } else {
      console.debug(`[ConnectionsSync] Phase 2: no data parsed for ${publicId} — skipping import`);
    }

    // Persist progress (resumable)
    const idxUpdate = {
      id: job.id,
      last_processed_urn_index: i + 1,
      profiles_enriched: job.profiles_enriched,
      updated_at: new Date().toISOString(),
    };
    Object.assign(job, idxUpdate);
    await updateSyncJob(idxUpdate);

    emitProgress(job);

    // Throttle before the next profile (±30% jitter, hard-coded, not configurable)
    if (i + 1 < profiles.length) {
      const delay = withJitter30(PROFILE_FETCH_THROTTLE_MS);
      console.debug(`[ConnectionsSync] Phase 2: throttle ${delay}ms before next profile`);
      await sleep(delay);
    }
  }

  console.info(
    `[ConnectionsSync] Phase 2 (RSC) complete. ` +
    `Enriched: ${job.profiles_enriched}, skipped (no publicId): ${skipped}`
  );
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

  // Load the optional test cap (test runs only; no-op in production).
  await loadTestMaxProfiles();

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
    // Back-fill collected_profiles on old job records that pre-date this field.
    if (!Array.isArray(job.collected_profiles)) {
      job.collected_profiles = [];
    }
  } else {
    job = await createSyncJob(userId);
    if (!job) {
      console.error("[ConnectionsSync] Could not create sync job");
      emitFailed(null, "job_creation_failed");
      return;
    }
    // Ensure the field is initialised on fresh jobs created before the SW update
    if (!Array.isArray(job.collected_profiles)) {
      job.collected_profiles = [];
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
