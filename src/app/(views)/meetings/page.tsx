"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RECORDINGS, PLAN } from "@/lib/mock/recordings";
import Library from "@/components/meetings/Library";
import Recap from "@/components/meetings/Recap";
import Capture from "@/components/meetings/Capture";
import EmptyState from "@/components/meetings/EmptyState";
import UsageMeter from "@/components/meetings/UsageMeter";
import type { Sentiment } from "@/types/meeting";

type Tab = "library" | "recap" | "capture";

export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      }
    >
      <MeetingsView />
    </Suspense>
  );
}

function MeetingsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get("id");

  const [tab, setTab] = useState<Tab>(queryId ? "recap" : "library");
  const [activeId, setActiveId] = useState<string | null>(queryId);
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [forceEmpty, setForceEmpty] = useState(false);

  // Sync deep-link
  useEffect(() => {
    if (queryId) {
      setActiveId(queryId);
      setTab("recap");
    }
  }, [queryId]);

  const recordings = forceEmpty ? [] : RECORDINGS;
  const filtered = useMemo(
    () =>
      sentimentFilter === "all"
        ? recordings
        : recordings.filter((r) => r.sentiment === sentimentFilter),
    [recordings, sentimentFilter]
  );

  const active = recordings.find((r) => r.id === activeId) ?? null;
  const remainingMin = PLAN.freeMinutesCap - PLAN.freeMinutesUsed;
  const showUsageMeter = PLAN.tier === "free" && remainingMin <= 30;

  const openRecap = (id: string) => {
    setActiveId(id);
    setTab("recap");
    router.replace(`/meetings?id=${id}`, { scroll: false });
  };

  const onCaptureEnd = () => {
    const first = recordings[0];
    if (first) openRecap(first.id);
  };

  const onSwitchTab = (next: Tab) => {
    setTab(next);
    if (next !== "recap" && activeId) {
      setActiveId(null);
      router.replace("/meetings", { scroll: false });
    }
  };

  if (recordings.length === 0) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: "var(--bg)" }}>
        <EmptyState
          plan={PLAN}
          onStartLive={() => {
            setForceEmpty(false);
            setTab("capture");
          }}
          onUpload={() => {
            setForceEmpty(false);
            setTab("capture");
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-[1200px] mx-auto px-8 pt-10 pb-12">
        {/* Top headline */}
        <header className="flex items-end justify-between gap-6 pb-7">
          <div className="max-w-[640px]">
            <p
              className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-2"
              style={{ color: "var(--ink-3)" }}
            >
              Meetings
            </p>
            <h1
              className="font-display italic text-[44px] leading-[1.02] tracking-tight mb-3"
              style={{ color: "var(--ink)" }}
            >
              Every conversation, kept.
            </h1>
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: "var(--ink-2)" }}
            >
              Capture a call live or upload a recording after, get a summary,
              the action items, and the coach&rsquo;s read on what to do next.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setTab("capture")}
              className="px-3.5 py-2 rounded-md text-[12.5px] font-medium transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              Upload
            </button>
            <button
              onClick={() => setTab("capture")}
              className="px-3.5 py-2 rounded-md text-[12.5px] font-medium transition-colors flex items-center gap-2"
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--bad)" }}
              />
              Capture live
            </button>
          </div>
        </header>

        {showUsageMeter && <UsageMeter plan={PLAN} />}

        {/* Tabs */}
        <div
          className="flex items-center gap-1 mb-6 pb-3"
          style={{ borderBottom: "1px solid var(--line-soft)" }}
        >
          <TabButton
            active={tab === "library"}
            onClick={() => onSwitchTab("library")}
          >
            Library
            <span
              className="ml-1.5 font-mono text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              {recordings.length}
            </span>
          </TabButton>
          {active && (
            <TabButton active={tab === "recap"} onClick={() => setTab("recap")}>
              Recap
              <span
                className="ml-1.5"
                style={{ color: "var(--ink-3)" }}
              >
                · {active.contactName.split(" ")[0]}
              </span>
            </TabButton>
          )}
          <TabButton
            active={tab === "capture"}
            onClick={() => onSwitchTab("capture")}
          >
            New capture
          </TabButton>
          <div className="flex-1" />
          <button
            onClick={() => setForceEmpty(true)}
            className="px-2.5 py-1 rounded-md text-[10.5px] font-mono uppercase tracking-wider transition-colors"
            style={{ color: "var(--ink-4)" }}
            title="Preview empty state"
          >
            ◌ Empty state
          </button>
        </div>

        {/* Tab content */}
        {tab === "library" && (
          <Library
            recordings={filtered}
            totalCount={recordings.length}
            sentimentFilter={sentimentFilter}
            onFilterChange={setSentimentFilter}
            onOpen={openRecap}
          />
        )}
        {tab === "recap" && active && <Recap rec={active} />}
        {tab === "capture" && <Capture plan={PLAN} onEnd={onCaptureEnd} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-[12.5px] font-medium rounded-md transition-colors"
      style={{
        color: active ? "var(--ink)" : "var(--ink-3)",
        background: active ? "var(--surface)" : "transparent",
        boxShadow: active ? "inset 0 0 0 1px var(--line)" : "none",
      }}
    >
      {children}
    </button>
  );
}
