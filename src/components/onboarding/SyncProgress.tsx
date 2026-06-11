"use client";

import { useSyncJob } from "@/hooks/useSyncJob";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import type { SyncJob } from "@/types/database";
import type { SyncProgressPayload } from "@/hooks/useExtensionBridge";
import {
  CardShell,
  SyncActionButton,
  LoadingSkeleton,
  ErrorCard,
  PhaseRow,
  CompletedCard,
  PausedCard,
  FailedCard,
} from "./SyncProgressStates";

// ---------------------------------------------------------------------------
// ETA helper
// Phase 1: ~0.1 s/contact (page scrape), Phase 2: ~2 s/profile (throttled)
// ---------------------------------------------------------------------------

function estimateMinsRemaining(
  phase: 1 | 2 | "list" | "batch" | "done",
  processed: number,
  total: number
): number {
  const remaining = Math.max(0, total - processed);
  if (phase === 1 || phase === "list") {
    return Math.max(1, Math.ceil((remaining * 0.1) / 60));
  }
  if (phase === 2 || phase === "batch") {
    // ~2 s/profile (700 ms throttle + ~1.3 s network latency)
    return Math.max(1, Math.ceil((remaining * 2) / 60));
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Derived display state — merges live extension events with polled DB row
// ---------------------------------------------------------------------------

interface DisplayState {
  phase: 1 | 2;
  connectionsImported: number;
  profilesEnriched: number;
  totalConnections: number | null;
  capHit: boolean;
  isComplete: boolean;
  isFailed: boolean;
  failReason: string | null;
}

function liveToDisplay(p: SyncProgressPayload): DisplayState {
  return {
    phase: p.phase,
    connectionsImported: p.connections_imported,
    profilesEnriched: p.profiles_enriched,
    totalConnections: p.total_connections,
    capHit: p.cap_hit,
    isComplete: false,
    isFailed: false,
    failReason: null,
  };
}

function jobToDisplay(job: SyncJob): DisplayState {
  const phase: 1 | 2 = job.phase === "list" ? 1 : 2;
  return {
    phase,
    connectionsImported: job.processed_contacts,
    profilesEnriched: job.phase === "batch" ? job.processed_contacts : 0,
    totalConnections: job.total_contacts > 0 ? job.total_contacts : null,
    capHit: job.total_contacts >= 2500,
    isComplete: job.status === "completed" || job.phase === "done",
    isFailed: job.status === "failed",
    failReason: job.error,
  };
}

// ---------------------------------------------------------------------------
// In-progress card — uses merged DisplayState
// ---------------------------------------------------------------------------

function InProgressCard({
  state,
  onPause,
}: {
  state: DisplayState;
  onPause?: () => void;
}) {
  const { phase, connectionsImported, profilesEnriched, totalConnections } = state;
  const total = totalConnections ?? 0;

  const phase1Done = phase === 2;
  const phase1Pct =
    phase1Done
      ? undefined
      : total > 0
      ? Math.round((connectionsImported / total) * 100)
      : undefined;

  const phase2Active = phase === 2;
  const phase2Pct =
    phase2Active && total > 0
      ? Math.round((profilesEnriched / total) * 100)
      : undefined;

  const processed = phase === 1 ? connectionsImported : profilesEnriched;
  const minsLeft =
    total > 0 ? estimateMinsRemaining(phase, processed, total) : 0;

  const countLabel =
    phase === 1
      ? `${connectionsImported.toLocaleString()} of ${total > 0 ? total.toLocaleString() : "…"} found`
      : `${profilesEnriched.toLocaleString()} of ${total > 0 ? total.toLocaleString() : "…"} enriched`;

  return (
    <CardShell>
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        Syncing your network
      </h3>
      <div className="space-y-2.5">
        <PhaseRow
          label="Phase 1: finding connections"
          done={phase1Done}
          active={!phase1Done}
          pct={phase1Pct}
        />
        <PhaseRow
          label="Phase 2: enriching profiles"
          done={false}
          active={phase2Active}
          pct={phase2Pct}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] tabular-nums" style={{ color: "var(--ink-2)" }}>
            {countLabel}
          </p>
          {minsLeft > 0 && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-4)" }}>
              About {minsLeft} minute{minsLeft !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
        {onPause && (
          <SyncActionButton variant="secondary" onClick={onPause}>
            Pause sync
          </SyncActionButton>
        )}
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface SyncProgressProps {
  jobId: string;
  resumeAt?: string;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
}

export default function SyncProgress({
  jobId,
  resumeAt,
  onPause,
  onResume,
  onRetry,
}: SyncProgressProps) {
  // Polled fallback (DB row)
  const { job, loading, error } = useSyncJob(jobId);

  // Live events from the extension (preferred when available)
  const { lastProgress, syncComplete, syncFailed } = useExtensionBridge();

  // ---- Determine terminal states from live events first -------------------

  if (syncFailed && (syncFailed.sync_job_id === jobId || syncFailed.sync_job_id === null)) {
    const failedJob: SyncJob = job ?? {
      id: jobId,
      user_id: "",
      status: "failed",
      phase: "batch",
      total_contacts: 0,
      processed_contacts: 0,
      last_completed_page: 0,
      last_processed_urn_index: 0,
      error: syncFailed.reason,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
    return <FailedCard job={failedJob} onRetry={onRetry} />;
  }

  if (syncComplete && syncComplete.sync_job_id === jobId) {
    const completedJob: SyncJob = job ?? {
      id: jobId,
      user_id: "",
      status: "completed",
      phase: "done",
      total_contacts: syncComplete.total_connections ?? syncComplete.connections_imported,
      processed_contacts: syncComplete.connections_imported,
      last_completed_page: 0,
      last_processed_urn_index: 0,
      error: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    return <CompletedCard job={completedJob} />;
  }

  // ---- Prefer live progress over polled data for in-progress display ------

  if (lastProgress && lastProgress.sync_job_id === jobId) {
    // Check polled job for paused state (extension won't emit events when paused)
    if (job?.status === "paused") {
      return <PausedCard resumeAt={resumeAt} onResume={onResume} />;
    }
    return <InProgressCard state={liveToDisplay(lastProgress)} onPause={onPause} />;
  }

  // ---- Fall back to polled data -------------------------------------------

  if (loading && !job) return <LoadingSkeleton />;
  if (error && !job) return <ErrorCard message={error} />;
  if (!job) return <ErrorCard message="Sync job not found." />;

  if (job.status === "completed" || job.phase === "done") return <CompletedCard job={job} />;
  if (job.status === "paused") return <PausedCard resumeAt={resumeAt} onResume={onResume} />;
  if (job.status === "failed") return <FailedCard job={job} onRetry={onRetry} />;

  return <InProgressCard state={jobToDisplay(job)} onPause={onPause} />;
}
