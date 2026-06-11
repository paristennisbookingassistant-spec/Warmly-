"use client";

/**
 * components/v2/home/DiscoverCard.tsx
 * "Keep building your pipeline" discover action card.
 */

import Link from "next/link";
import { Icon } from "@/components/v2/icons";
import { DiscoverIllustration, DISCOVER_PALETTE as P } from "./DiscoverIllustration";

interface DiscoverCardProps {
  firstRun: boolean;
  pendingCount: number;
}

export function DiscoverCard({ firstRun, pendingCount }: DiscoverCardProps) {
  return (
    <Link
      href="/v2/discover"
      className="group bg-white border rounded-3xl text-left flex flex-col overflow-hidden relative transition-all duration-200"
      style={{ borderColor: P.border, boxShadow: P.shadowBase, textDecoration: "none" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = P.borderHover;
        el.style.boxShadow = P.shadowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = P.border;
        el.style.boxShadow = P.shadowBase;
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: P.accent }} />

      <div
        className="px-8 pt-8 pb-6 relative overflow-hidden flex flex-col justify-end"
        style={{ background: "radial-gradient(circle at 78% 22%, #f0f6ec 0%, #e3edde 70%)", minHeight: 196 }}
      >
        <div
          className="absolute inset-0 opacity-[0.45] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(94,141,106,0.18) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-mono-tag mb-2" style={{ color: P.accent }}>
              Coach · discovery feed
            </div>
            <div className="font-display text-ink leading-tight mb-2" style={{ fontSize: 30 }}>
              {firstRun ? <>Discover new<br />contacts</> : <>Keep building<br />your pipeline</>}
            </div>
            <div className="text-[13.5px] text-ink-2">
              {firstRun ? "INSEAD alumni at your target companies" : "Coach searched while you were away"}
            </div>
          </div>
          <DiscoverIllustration />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-8 py-4 flex-1 grid grid-cols-2 gap-3">
          <FunnelRow
            icon={Icon.Users}
            value={pendingCount}
            label="in your screening queue"
            sub="saved, waiting on a yes/no"
            highlight={false}
          />
          <FunnelRow
            icon={Icon.Sparkles}
            value={firstRun ? "—" : "new"}
            label={firstRun ? "INSEAD alumni indexed" : "fresh matches from coach"}
            sub={firstRun ? "across INSEAD directory" : "never seen, ready to review"}
            highlight={!firstRun}
          />
        </div>

        <div className="px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: "#ece2d0" }}>
          <span className="text-[11.5px] text-ink-3">
            {firstRun ? "First push from your coach" : "Swipe through queue · review new matches"}
          </span>
          <span
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-medium transition-all group-hover:scale-[1.03]"
            style={{ background: P.accent, color: "#ffffff" }}
          >
            {firstRun ? "Start discovery" : "Open discovery"}
            <Icon.ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

interface FunnelRowProps {
  icon: React.ComponentType<{ size?: number }>;
  value: number | string;
  label: string;
  sub: string;
  highlight: boolean;
}

function FunnelRow({ icon: I, value, label, sub, highlight }: FunnelRowProps) {
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5 rounded-xl relative"
      style={{
        background: highlight ? "#eef5ea" : "#fbf6ec",
        border: highlight ? `1px solid ${P.soft}` : "1px solid transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#ffffff", color: P.accent, border: `1px solid ${P.soft}` }}
        >
          <I size={11} />
        </div>
        <span className="font-display leading-none text-ink" style={{ fontSize: 24 }}>{value}</span>
        {highlight && (
          <span
            className="pulse-dot ml-auto"
            style={{ background: P.accent, width: 7, height: 7, borderRadius: "50%", display: "inline-block" }}
          />
        )}
      </div>
      <div className="text-[11.5px] font-medium text-ink-2 leading-tight">{label}</div>
      <div className="text-[10.5px] text-ink-4 leading-tight">{sub}</div>
    </div>
  );
}
