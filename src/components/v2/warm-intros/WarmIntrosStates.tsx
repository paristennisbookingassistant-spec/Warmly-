"use client";

/**
 * components/v2/warm-intros/WarmIntrosStates.tsx
 * Opt-in prompt, empty state, and error state for the warm-intros lane.
 * Extracted to keep WarmIntrosLane.tsx under 150 lines.
 */

import Link from "next/link";
import { Icon } from "@/components/v2/icons";

// ---------- Opt-in prompt ----------

export function OptInPrompt() {
  return (
    <div
      className="rounded-2xl border p-8 flex flex-col items-center text-center gap-4 max-w-md mx-auto mt-8"
      style={{ borderColor: "#e5d8be", background: "#fbf6ec" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "#f3e2cd" }}
      >
        <Icon.Network size={26} style={{ color: "#b87a4a" }} />
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-ink mb-1.5">Enable Warm Intros</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          Turn on Warm Intros in Settings to see who your connections can introduce
          you to. Warmly cross-references opted-in peers&apos; networks against your
          goal — you only see people you don&apos;t already know.
        </p>
      </div>
      <Link
        href="/v2/settings"
        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13.5px] font-medium transition-all duration-150"
        style={{ background: "#b87a4a", color: "#ffffff" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "#a06838";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "#b87a4a";
        }}
      >
        Go to Settings
        <Icon.ArrowRight size={14} />
      </Link>
    </div>
  );
}

// ---------- Empty state ----------

export function WarmIntrosEmptyState() {
  return (
    <div
      className="rounded-2xl border border-dashed p-10 flex flex-col items-center text-center gap-3 mt-8"
      style={{ borderColor: "#d9cdb4" }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "#f3e2cd" }}
      >
        <Icon.Users size={22} style={{ color: "#b87a4a" }} />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-ink mb-1">No warm intros yet</div>
        <p className="text-[12.5px] leading-relaxed max-w-xs" style={{ color: "var(--ink-3)" }}>
          No warm intros yet — sync more of your network so Warmly can find
          2nd-degree matches for you.
        </p>
      </div>
    </div>
  );
}

// ---------- Error state ----------

export function WarmIntrosError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-2xl border p-8 flex flex-col items-center text-center gap-4 max-w-md mx-auto mt-8"
      style={{ borderColor: "#fca5a5", background: "#fef2f2" }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "#fee2e2" }}
      >
        <Icon.Alert size={20} style={{ color: "#ef4444" }} />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-ink mb-1">
          Could not load warm intros
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {message}
        </div>
      </div>
      <button
        onClick={onRetry}
        className="h-9 px-4 rounded-lg text-[13px] font-medium transition-all"
        style={{ background: "#b87a4a", color: "#ffffff" }}
      >
        Retry
      </button>
    </div>
  );
}
