"use client";

/**
 * LastSyncStatus.tsx
 * Displays summary of the most recent sync job in Settings > Connections.
 */

import type { SyncJob } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils/index";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function LastSyncStatusSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3.5 w-48 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
      <div className="h-3.5 w-20 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LastSyncStatus({ job }: { job: SyncJob }) {
  const isComplete = job.status === "completed" || job.phase === "done";
  const isFailed = job.status === "failed";
  const isActive = job.status === "in_progress";
  const isPaused = job.status === "paused";

  const label = isComplete
    ? `${job.total_contacts.toLocaleString()} contacts synced`
    : isActive
    ? "Sync in progress"
    : isPaused
    ? "Sync paused"
    : isFailed
    ? "Last sync failed"
    : "Sync pending";

  const badgeStyle: React.CSSProperties = isComplete
    ? {
        background: "color-mix(in oklch, var(--good) 15%, var(--surface))",
        color: "var(--good)",
      }
    : isFailed
    ? {
        background: "color-mix(in oklch, var(--bad) 15%, var(--surface))",
        color: "var(--bad)",
      }
    : {
        background: "color-mix(in oklch, var(--warn) 15%, var(--surface))",
        color: "var(--warn)",
      };

  const badgeText = isComplete
    ? "Complete"
    : job.status.replace("_", " ");

  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3"
      style={{ background: "var(--bg-sunk)", border: "1px solid var(--line-soft)" }}
    >
      <div className="space-y-0.5">
        <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{label}</p>
        <p className="text-[12px]" style={{ color: "var(--ink-4)" }}>
          {job.completed_at
            ? `Completed ${formatRelativeTime(job.completed_at)}`
            : `Started ${formatRelativeTime(job.started_at)}`}
        </p>
      </div>
      <span
        className="text-[11px] font-medium px-2 py-1 rounded-full"
        style={badgeStyle}
      >
        {badgeText}
      </span>
    </div>
  );
}
