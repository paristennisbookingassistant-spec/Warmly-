"use client";

/**
 * components/v2/settings/LinkedInIntegrationBlock.tsx
 * LinkedIn integration row — extension status + re-sync action.
 */

import { useState } from "react";
import { SectionLabel, Btn } from "@/components/v2/primitives";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { Icon } from "@/components/v2/icons";
import { useToast } from "@/components/v2/Toast";
import { SyncStatusRow } from "./SyncStatusRow";
import type { SyncJob } from "@/types/database";

type DotState = "detecting" | "connected" | "warning" | "not-installed";

function getDotState(installed: boolean | null, linkedinLoggedIn: boolean | null): DotState {
  if (installed === null) return "detecting";
  if (!installed) return "not-installed";
  if (linkedinLoggedIn) return "connected";
  return "warning";
}

function StatusIndicator({ dot }: { dot: DotState }) {
  const cfg =
    dot === "connected"   ? { bg: "#dcebd9", fg: "#34553e", label: "Connected" } :
    dot === "warning"     ? { bg: "#fff3cd", fg: "#92400e", label: "Action needed" } :
    dot === "not-installed" ? { bg: "#f3e2cd", fg: "#7a4a25", label: "Not installed" } :
                            { bg: "var(--line-soft)", fg: "var(--ink-3)", label: "Detecting…" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span
        className={`inline-block w-[6px] h-[6px] rounded-full ${dot === "connected" ? "pulse-dot" : ""}`}
        style={{ background: cfg.fg }}
      />
      {cfg.label}
    </span>
  );
}

export function LinkedInIntegrationBlock() {
  const bridge = useExtensionBridge();
  const showToast = useToast();
  // loading state for the re-sync action
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const dot = getDotState(bridge.installed, bridge.linkedinLoggedIn);

  async function handleResync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json() as { data?: SyncJob; error?: { message?: string } };
      if (!res.ok || !body.data) {
        setSyncError(body.error?.message ?? "Could not start re-sync.");
        return;
      }
      window.postMessage(
        { source: "WARMLY_WEBAPP", type: "START_NETWORK_SYNC",
          payload: { user_id: body.data.user_id, sync_job_id: body.data.id } },
        "*"
      );
      showToast("LinkedIn sync started.");
    } catch {
      setSyncError("Network error. Check your connection.");
    } finally {
      setSyncing(false);
    }
  }

  const statusText =
    dot === "detecting"      ? "Detecting extension…" :
    dot === "connected"      ? "Extension installed · LinkedIn connected" :
    dot === "warning"        ? "Extension installed · Sign in to LinkedIn to sync" :
                               "Chrome extension not detected";

  return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <SectionLabel className="mb-5">Integrations</SectionLabel>

      <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: "#ece2d0", background: "#fbf6ec" }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#0A66C2" }}>
          <Icon.Network size={18} style={{ color: "#ffffff" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium text-ink">LinkedIn</div>
          <div className="text-[12px] text-ink-3 mt-0.5">{statusText}</div>
        </div>
        <StatusIndicator dot={dot} />
        {bridge.installed && bridge.linkedinLoggedIn && (
          <Btn variant="secondary" size="sm" disabled={syncing} onClick={() => void handleResync()}>
            {syncing ? "Starting…" : "Re-sync"}
          </Btn>
        )}
        {!bridge.installed && (
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium"
            style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", textDecoration: "none" }}
          >
            Install
            <Icon.ArrowRight size={12} />
          </a>
        )}
      </div>

      {syncError && (
        <div className="mt-3 rounded-lg px-4 py-3 text-[13px]" style={{ background: "var(--accent-soft)", color: "var(--bad)", border: "1px solid var(--line)" }}>
          {syncError}
        </div>
      )}

      {bridge.lastProgress && (
        <SyncStatusRow
          phase={bridge.lastProgress.phase}
          imported={bridge.lastProgress.connections_imported}
          enriched={bridge.lastProgress.profiles_enriched}
          total={bridge.lastProgress.total_connections}
        />
      )}

      <p className="mt-4 text-[12px] leading-relaxed rounded-lg px-3 py-2.5"
        style={{ background: "var(--bg-sunk)", color: "var(--ink-3)", border: "1px solid var(--line-soft)" }}>
        The extension reads your LinkedIn connections from your own browser session. It never logs
        in on your behalf and never sends any messages or actions.
      </p>
    </div>
  );
}
