"use client";

/**
 * SyncProgressStates.tsx
 * Shared primitives + state cards for SyncProgress.tsx.
 */

import { useRouter } from "next/navigation";
import type { SyncJob } from "@/types/database";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-6 py-6 space-y-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-soft)" }}
    >
      {children}
    </div>
  );
}

export function SyncActionButton({
  onClick,
  children,
  variant = "primary",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const s: React.CSSProperties = variant === "primary"
    ? { background: "var(--ink)", color: "var(--bg)" }
    : { background: "transparent", color: "var(--ink-3)", border: "1px solid var(--line)" };
  return (
    <button className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150" style={s} onClick={onClick}>
      {children}
    </button>
  );
}

export function LoadingSkeleton() {
  return (
    <CardShell>
      <div className="space-y-3">
        <div className="h-4 w-40 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
        <div className="h-3 w-56 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
      </div>
    </CardShell>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return <CardShell><p className="text-[13px]" style={{ color: "var(--bad)" }}>{message}</p></CardShell>;
}

export function PhaseRow({ label, done, active, pct }: { label: string; done: boolean; active: boolean; pct?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[160px] text-[13px]" style={{ color: done ? "var(--ink-3)" : "var(--ink)" }}>{label}</div>
      {done ? (
        <span className="text-[12px] font-medium" style={{ color: "var(--good)" }}>done</span>
      ) : active && pct !== undefined ? (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line-soft)" }}>
            <div className="h-full rounded-full progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: "var(--ink-4)" }}>{pct}%</span>
        </div>
      ) : (
        <span className="text-[12px]" style={{ color: "var(--ink-4)" }}>waiting</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State cards
// ---------------------------------------------------------------------------

export function CompletedCard({ job }: { job: SyncJob }) {
  const router = useRouter();
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>Sync complete</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {job.total_contacts.toLocaleString()} contacts now in Warmly with full profile details.
          {job.total_contacts >= 2500 && " You reached the 2,500-contact sync limit. Upgrade to sync more."}
        </p>
      </div>
      <SyncActionButton onClick={() => router.push("/contacts")}>Open my contacts</SyncActionButton>
    </CardShell>
  );
}

export function PausedCard({ resumeAt, onResume }: { resumeAt?: string; onResume?: () => void }) {
  const timeLabel = resumeAt
    ? (() => {
        const diff = new Date(resumeAt).getTime() - Date.now();
        if (diff <= 0) return "shortly";
        const mins = Math.ceil(diff / 60000);
        return mins < 60 ? `in about ${mins} minute${mins !== 1 ? "s" : ""}` : `in about ${Math.ceil(diff / 3600000)} hours`;
      })()
    : "in about 1 hour";
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--warn)" }}>Sync paused</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          LinkedIn requested a cooldown. We&rsquo;ll resume automatically {timeLabel}.
        </p>
      </div>
      {onResume && <SyncActionButton variant="secondary" onClick={onResume}>Try resume now</SyncActionButton>}
    </CardShell>
  );
}

export function FailedCard({ job, onRetry }: { job: SyncJob; onRetry?: () => void }) {
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--bad)" }}>Sync failed</h3>
        {job.error && <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>{job.error}</p>}
      </div>
      <div className="flex items-center gap-3">
        {onRetry && <SyncActionButton onClick={onRetry}>Try again</SyncActionButton>}
        <SyncActionButton variant="secondary" onClick={() => window.open("mailto:support@warmly.app", "_blank")}>
          Get help
        </SyncActionButton>
      </div>
    </CardShell>
  );
}
