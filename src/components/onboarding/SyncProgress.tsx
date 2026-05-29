"use client";

import { useSyncJob } from "@/hooks/useSyncJob";
import type { SyncJob } from "@/types/database";
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
// In-progress state (only state with enough logic to live here)
// ---------------------------------------------------------------------------

function estimateMinsRemaining(job: SyncJob): number {
  if (job.phase === "list") {
    const remaining = (job.total_contacts || 500) - job.processed_contacts;
    return Math.max(1, Math.ceil((remaining * 0.1) / 60));
  }
  if (job.phase === "batch") {
    const remaining = job.total_contacts - job.processed_contacts;
    return Math.max(1, Math.ceil((remaining * 10) / 60));
  }
  return 0;
}

function InProgressCard({ job, onPause }: { job: SyncJob; onPause?: () => void }) {
  const listDone = job.phase === "batch" || job.phase === "done";
  const batchActive = job.phase === "batch";
  const pct =
    job.total_contacts > 0
      ? Math.round((job.processed_contacts / job.total_contacts) * 100)
      : 0;
  const minsLeft = estimateMinsRemaining(job);

  return (
    <CardShell>
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        Syncing your network
      </h3>
      <div className="space-y-2.5">
        <PhaseRow
          label="Phase 1: finding connections"
          done={listDone}
          active={!listDone}
          pct={listDone ? undefined : pct}
        />
        <PhaseRow
          label="Phase 2: enriching profiles"
          done={false}
          active={batchActive}
          pct={batchActive ? pct : undefined}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] tabular-nums" style={{ color: "var(--ink-2)" }}>
            {job.processed_contacts.toLocaleString()} of{" "}
            {job.total_contacts > 0 ? job.total_contacts.toLocaleString() : "..."} contacts
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
  const { job, loading, error } = useSyncJob(jobId);

  if (loading && !job) return <LoadingSkeleton />;
  if (error && !job) return <ErrorCard message={error} />;
  if (!job) return <ErrorCard message="Sync job not found." />;

  if (job.status === "completed" || job.phase === "done") return <CompletedCard job={job} />;
  if (job.status === "paused") return <PausedCard resumeAt={resumeAt} onResume={onResume} />;
  if (job.status === "failed") return <FailedCard job={job} onRetry={onRetry} />;

  return <InProgressCard job={job} onPause={onPause} />;
}
