"use client";

import { useCallback, useEffect, useState } from "react";
import LinkedInSyncCard from "@/components/onboarding/LinkedInSyncCard";
import SyncProgress from "@/components/onboarding/SyncProgress";
import { LastSyncStatus, LastSyncStatusSkeleton } from "@/components/onboarding/LastSyncStatus";
import type { SyncJob } from "@/types/database";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConnectionsSettingsPage() {
  const [latestJob, setLatestJob] = useState<SyncJob | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [syncStarting, setSyncStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingLatest(true);
    setFetchError(null);

    fetch("/api/sync-jobs", { credentials: "include" })
      .then((r) => r.json())
      .then((body: { data?: SyncJob | null; error?: { message?: string } }) => {
        if (cancelled) return;
        if (body.data) {
          setLatestJob(body.data);
          if (body.data.status === "in_progress" || body.data.status === "pending") {
            setActiveJobId(body.data.id);
          }
        } else if (body.error) {
          setFetchError(body.error.message ?? "Could not load sync status.");
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError("Network error. Try reloading the page.");
      })
      .finally(() => {
        if (!cancelled) setLoadingLatest(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleResync = useCallback(async () => {
    setSyncStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/sync-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json() as { data?: SyncJob; error?: { message?: string } };
      if (!res.ok || !body.data) {
        setStartError(body.error?.message ?? "Could not start re-sync. Try again.");
        return;
      }
      setActiveJobId(body.data.id);
      window.postMessage(
        { source: "WARMLY_WEBAPP", type: "START_NETWORK_SYNC", payload: { jobId: body.data.id } },
        "*"
      );
    } catch {
      setStartError("Network error. Check your connection and try again.");
    } finally {
      setSyncStarting(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setActiveJobId(null);
    setStartError(null);
  }, []);

  return (
    <div className="h-full overflow-y-auto px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-[600px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase mb-1" style={{ color: "var(--ink-3)" }}>
            Settings
          </p>
          <h1 className="font-display italic text-[40px] leading-[1.05] tracking-tight" style={{ color: "var(--ink)" }}>
            LinkedIn connection
          </h1>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Manage your LinkedIn network sync. You can re-sync at any time to bring in new connections.
          </p>
        </div>

        {/* Last sync status */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--ink-3)" }}>
            Last sync
          </h2>
          {loadingLatest ? (
            <LastSyncStatusSkeleton />
          ) : fetchError ? (
            <p className="text-[13px]" style={{ color: "var(--bad)" }}>{fetchError}</p>
          ) : latestJob ? (
            <LastSyncStatus job={latestJob} />
          ) : (
            <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>No sync has run yet.</p>
          )}
        </section>

        {/* Active sync or re-sync card */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--ink-3)" }}>
            {activeJobId ? "Sync in progress" : "Re-sync"}
          </h2>
          {startError && (
            <div
              className="rounded-lg px-4 py-3 text-[13px]"
              style={{ background: "var(--accent-soft)", color: "var(--bad)", border: "1px solid var(--line)" }}
            >
              {startError}
            </div>
          )}
          {activeJobId ? (
            <SyncProgress jobId={activeJobId} onRetry={handleRetry} />
          ) : (
            <LinkedInSyncCard onSyncStart={handleResync} syncStarting={syncStarting} />
          )}
        </section>

        {/* Privacy note */}
        <div
          className="rounded-lg px-4 py-3 text-[12.5px] leading-relaxed"
          style={{ background: "var(--bg-sunk)", border: "1px solid var(--line-soft)", color: "var(--ink-3)" }}
        >
          The extension reads your LinkedIn connections from your own browser session. It never
          logs in on your behalf and never sends any messages or actions.
        </div>
      </div>
    </div>
  );
}
