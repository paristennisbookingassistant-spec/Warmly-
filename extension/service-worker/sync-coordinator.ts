/**
 * service-worker/sync-coordinator.ts
 *
 * Handles sync-related messages from the content script and coordinates with
 * the backend API. Runs in the service worker context.
 *
 * Responsibilities (SHORT-LIVED tasks only — no loops):
 *   - Create sync_job records via backend API
 *   - Update sync_job status/progress via backend API
 *   - Forward bulk-import batches to backend API
 *   - Persist job state to chrome.storage.local for resumability
 *   - Relay SYNC_PROGRESS / SYNC_COMPLETE / SYNC_FAILED to the web app tabs
 *     by forwarding WEBAPP_* messages to auth-bridge content scripts
 *   - Handle START_NETWORK_SYNC: find the LinkedIn tab, inject the content
 *     script trigger via chrome.tabs.sendMessage
 *
 * The orchestration LOOP itself runs in content-script/connections-sync.ts —
 * never here. MV3 service workers die after 30 s of inactivity.
 */

import { bulkImportContacts, createSyncJobRecord, updateSyncJobRecord } from "./api-client";
import type { SyncJob, BulkImportRequest, StartNetworkSyncPayload } from "../shared/types";
import { STORAGE_KEYS } from "../shared/constants";

// ---------------------------------------------------------------------------
// Storage helpers — persist sync job for resumability
// ---------------------------------------------------------------------------

export async function persistSyncJob(job: SyncJob): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_JOB]: job });
}

export async function loadPersistedSyncJob(): Promise<SyncJob | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SYNC_JOB);
    const job = result[STORAGE_KEYS.SYNC_JOB] as SyncJob | undefined;
    return job ?? null;
  } catch {
    return null;
  }
}

export async function clearPersistedSyncJob(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.SYNC_JOB);
}

/**
 * Builds a fresh extension-shaped SyncJob seeded with a canonical id.
 * Used when the web app created the sync_job server-side (so it exists in the
 * backend with that id) but the extension has no local copy yet. The extension
 * model is richer than the backend record (collected_urns, cap_hit, etc.), so
 * we materialize a local job rather than trying to map the backend shape.
 */
function buildFreshLocalJob(userId: string, jobId: string): SyncJob {
  const now = new Date().toISOString();
  return {
    id: jobId,
    user_id: userId,
    status: "pending",
    created_at: now,
    updated_at: now,
    total_connections: null,
    connections_imported: 0,
    profiles_enriched: 0,
    last_completed_page: -1,
    last_processed_urn_index: 0,
    collected_urns: [],
    cap_hit: false,
    backoff_count: 0,
    resume_after_ts: null,
  };
}

// ---------------------------------------------------------------------------
// Web app relay — broadcast sync events to warmly.app tabs
// ---------------------------------------------------------------------------

/**
 * Sends a WEBAPP_* message to all warmly.app content-script tabs so auth-bridge
 * can relay it to the page via postMessage.
 */
async function relayToWebApp(type: string, payload: unknown): Promise<void> {
  const webAppTabs = await chrome.tabs.query({
    url: [
      "https://ai-networking-coach.vercel.app/*",
      "http://localhost:3000/*",
    ],
  });

  const message = { type: `WEBAPP_${type}`, payload };

  for (const tab of webAppTabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab may not have the auth-bridge content script loaded yet — non-fatal
      });
    }
  }
}

// ---------------------------------------------------------------------------
// LinkedIn tab helpers
// ---------------------------------------------------------------------------

/**
 * Finds an active LinkedIn tab, or creates one in the background if none is
 * open. The sync orchestrator runs as a content script on linkedin.com, so a
 * LinkedIn tab must exist for the sync to run. Per the build playbook, the
 * system creates the prerequisite rather than telling the user to "open X first".
 */
async function findOrCreateLinkedInTab(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ url: "*://www.linkedin.com/*" });
  if (tabs.length > 0 && tabs[0].id) return tabs[0].id;

  // None open — create one in the background (don't steal focus).
  const tab = await chrome.tabs.create({
    url: "https://www.linkedin.com/feed/",
    active: false,
  });
  if (!tab.id) return null;

  // Wait for the tab to finish loading so the content script is injected
  // and ready to receive TRIGGER_NETWORK_SYNC.
  await new Promise<void>((resolve) => {
    const listener = (tabId: number, changeInfo: { status?: string }) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Safety net: don't hang forever if onUpdated never fires.
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 12_000);
  });

  // Small extra delay so document_idle content-script registration settles.
  await new Promise((r) => setTimeout(r, 1500));
  return tab.id;
}

// ---------------------------------------------------------------------------
// CSRF token fallback — via chrome.cookies API
// Called when content-script getCsrfToken() can't read document.cookie
// because JSESSIONID is HttpOnly in the tab's context.
// ---------------------------------------------------------------------------

export async function getCsrfTokenViaCookies(): Promise<string | null> {
  try {
    const cookie = await chrome.cookies.get({
      url: "https://www.linkedin.com",
      name: "JSESSIONID",
    });
    if (!cookie?.value) return null;
    // Strip surrounding quotes: "ajax:1234" → ajax:1234
    const val = cookie.value.replace(/^"(.*)"$/, "$1");
    if (val.startsWith("ajax:")) return val;
    return null;
  } catch (err) {
    console.warn("[SyncCoordinator] chrome.cookies.get failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Message handlers (called from service-worker/index.ts)
// ---------------------------------------------------------------------------

/**
 * Handles START_NETWORK_SYNC from the web app (via auth-bridge → SW).
 * Creates a sync job and triggers the content script on the LinkedIn tab.
 */
export async function handleStartNetworkSync(
  payload: StartNetworkSyncPayload
): Promise<{ ok: boolean; sync_job_id?: string; error?: string }> {
  const { user_id, sync_job_id: resumeJobId } = payload;

  let job: SyncJob | null = null;

  if (resumeJobId) {
    job = await loadPersistedSyncJob();
    if (job?.id !== resumeJobId) {
      // The web app created this sync_job server-side (it exists in the backend
      // with this id) but the extension has no local copy. Seed a fresh local
      // extension-shaped job with the canonical id so the orchestrator and its
      // resume logic have the rich model they expect. This also makes
      // handleGetJob (loadPersistedSyncJob) resolve it for the content script.
      job = buildFreshLocalJob(user_id, resumeJobId);
      await persistSyncJob(job);
    }
  }

  if (!job && !resumeJobId) {
    // No job id supplied — create a brand-new one (extension-initiated sync).
    job = await createSyncJobRecord(user_id);
    if (!job) {
      return { ok: false, error: "Failed to create sync job" };
    }
    await persistSyncJob(job);
  }

  // Find or create a LinkedIn tab, then trigger the content script sync.
  const tabId = await findOrCreateLinkedInTab();
  if (!tabId) {
    return { ok: false, error: "Could not open a LinkedIn tab for sync." };
  }

  chrome.tabs.sendMessage(tabId, {
    type: "TRIGGER_NETWORK_SYNC",
    payload: {
      user_id,
      sync_job_id: job?.id ?? resumeJobId,
    },
  }).catch((err) => {
    console.error("[SyncCoordinator] Could not trigger content script sync:", err);
  });

  return { ok: true, sync_job_id: job?.id ?? resumeJobId };
}

/**
 * Handles SYNC_CREATE_JOB from content script.
 */
export async function handleCreateJob(
  payload: { user_id: string }
): Promise<SyncJob | null> {
  const job = await createSyncJobRecord(payload.user_id);
  if (job) await persistSyncJob(job);
  return job;
}

/**
 * Handles SYNC_GET_JOB from content script.
 */
export async function handleGetJob(
  payload: { job_id: string }
): Promise<SyncJob | null> {
  // Try local storage first (fast, avoids API call)
  const local = await loadPersistedSyncJob();
  if (local?.id === payload.job_id) return local;
  // Fallback: would fetch from backend — return null for now
  // (backend dev implements GET /api/sync-jobs/:id)
  return null;
}

/**
 * Handles SYNC_UPDATE_JOB from content script.
 * Merges the partial update into the persisted job and syncs to backend.
 */
export async function handleUpdateJob(
  partialJob: Partial<SyncJob> & { id: string }
): Promise<void> {
  // Merge with persisted state
  const local = await loadPersistedSyncJob();
  const merged: SyncJob = local?.id === partialJob.id
    ? { ...local, ...partialJob }
    : partialJob as SyncJob;

  await persistSyncJob(merged);
  await updateSyncJobRecord(partialJob.id, partialJob);

  // If status changed to completed or failed, relay to web app
  if (partialJob.status === "completed" || partialJob.status === "failed") {
    if (partialJob.status === "completed") {
      await clearPersistedSyncJob();
    }
  }
}

/**
 * Handles SYNC_BULK_IMPORT from content script.
 * Forwards the batch to the backend bulk-import endpoint.
 */
export async function handleBulkImport(request: BulkImportRequest): Promise<void> {
  const result = await bulkImportContacts(request);
  if (!result) {
    console.error(`[SyncCoordinator] Bulk import failed for phase ${request.phase}, ` +
      `${request.contacts.length} contacts`);
  }
}

/**
 * Handles WEBAPP_SYNC_* relay — forwards sync event to web app tabs.
 * Called when content script broadcasts via chrome.runtime.sendMessage.
 */
export async function handleWebAppRelay(type: string, payload: unknown): Promise<void> {
  await relayToWebApp(type, payload);
}
