"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import LinkedInSyncCard from "@/components/onboarding/LinkedInSyncCard";
import SyncProgress from "@/components/onboarding/SyncProgress";
import type { SyncJob } from "@/types/database";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConnectLinkedInPage() {
  const router = useRouter();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [syncStarting, setSyncStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleSyncStart = useCallback(async () => {
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
        setStartError(body.error?.message ?? "Could not start sync. Try again.");
        return;
      }

      // Job created on the server — now tell the extension to begin
      setActiveJobId(body.data.id);

      // Extension receives this message and begins Phase 1
      window.postMessage(
        {
          source: "WARMLY_WEBAPP",
          type: "START_NETWORK_SYNC",
          payload: { jobId: body.data.id },
        },
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

  const handleSkip = useCallback(() => {
    router.push("/chat");
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-[520px] space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: "var(--ink-3)" }}
          >
            Onboarding · Step 2
          </p>
          <h1
            className="font-display italic text-[38px] leading-[1.05] tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Connect LinkedIn
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Import your existing network so your contacts page is rich from day one.
          </p>
        </div>

        {/* Card area */}
        {startError && (
          <div
            className="rounded-lg px-4 py-3 text-[13px]"
            style={{ background: "var(--accent-soft)", color: "var(--bad)", border: "1px solid var(--line)" }}
          >
            {startError}
          </div>
        )}

        {activeJobId ? (
          <SyncProgress
            jobId={activeJobId}
            onRetry={handleRetry}
          />
        ) : (
          <LinkedInSyncCard
            onSyncStart={handleSyncStart}
            syncStarting={syncStarting}
          />
        )}

        {/* Privacy note */}
        <div
          className="rounded-lg px-4 py-3 text-[12.5px] leading-relaxed"
          style={{
            background: "var(--bg-sunk)",
            border: "1px solid var(--line-soft)",
            color: "var(--ink-3)",
          }}
        >
          The extension reads your LinkedIn connections from your own browser session. It never
          logs in on your behalf and never sends any messages or actions.
        </div>

        {/* Skip */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-[13px] transition-opacity duration-150 hover:opacity-70"
            style={{ color: "var(--ink-4)" }}
          >
            Skip for now, I&rsquo;ll add contacts manually
          </button>
        </div>
      </div>
    </div>
  );
}
