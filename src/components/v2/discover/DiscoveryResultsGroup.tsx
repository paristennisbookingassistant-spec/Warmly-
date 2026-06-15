"use client";

/**
 * components/v2/discover/DiscoveryResultsGroup.tsx
 * Module 4 — "Discovered at <Company>" results group.
 *
 * Renders inside the Doors view (below the two door cards) while a company
 * discovery is in flight or done. Shows:
 *   - A progress bar + state label while running
 *   - Individual DeckCard entries (reusing the lite ContactRow card style)
 *   - Loading / error / empty states
 */

import { Icon } from "../icons";
import { Avatar, TierBadge } from "../primitives";
import type { DiscoveryPhase, DiscoveryProgress } from "./useCompanyDiscovery";
import type { DeckCard } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiscoveryResultsGroupProps {
  companyName: string;
  phase: DiscoveryPhase;
  progress: DiscoveryProgress | null;
  cards: DeckCard[];
  errorMessage: string | null;
  onSave: (card: DeckCard) => void;
  onSkip: (card: DeckCard) => void;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Friendly labels for extension states
// ---------------------------------------------------------------------------

const STATE_LABELS: Record<string, string> = {
  RESOLVING_COMPANY: "Resolving company page…",
  SEARCHING_PROFILES: "Searching INSEAD alumni…",
  VISITING_PROFILE: "Visiting profiles…",
  WAITING: "Pacing requests…",
  RANKING: "Ranking results…",
};

// ---------------------------------------------------------------------------
// DiscoveryResultsGroup
// ---------------------------------------------------------------------------

export function DiscoveryResultsGroup({
  companyName,
  phase,
  progress,
  cards,
  errorMessage,
  onSave,
  onSkip,
  onDismiss,
}: DiscoveryResultsGroupProps) {
  const isRunning = phase === "running" || phase === "detecting" || phase === "creating_session";
  const isDone = phase === "done";
  const isError = phase === "error" || phase === "no_extension";

  const progressPct =
    progress && progress.profiles_total > 0
      ? Math.min(100, Math.round((progress.profiles_saved / progress.profiles_total) * 100))
      : isRunning
        ? 10
        : isDone
          ? 100
          : 0;

  const stateLabel = progress ? (STATE_LABELS[progress.state] ?? "Running…") : "Starting…";

  return (
    <div
      className="rounded-2xl border overflow-hidden mt-5 fade-up"
      style={{
        borderColor: "#e5d8be",
        background: "#fffdf9",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 4px 16px rgba(31,27,22,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#ece2d0" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#dde6ee", color: "#4a6f87" }}
          >
            <Icon.Users size={14} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink leading-tight">
              Discovered at {companyName}
            </div>
            <div className="text-[11px] text-ink-4 mt-0.5">
              {isDone
                ? `${cards.length} alumni found`
                : isRunning
                  ? stateLabel
                  : isError
                    ? "Discovery ended"
                    : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDone && cards.length > 0 && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px] font-medium"
              style={{ background: "#dcebd9", color: "#34553e" }}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ background: "#5e8d6a" }}
              />
              Done · {cards.length} found
            </span>
          )}
          {isRunning && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px] font-medium"
              style={{ background: "#dde6ee", color: "#2f4d63" }}
            >
              <span
                className="inline-block w-[6px] h-[6px] rounded-full pulse-dot"
                style={{ background: "#4a6f87" }}
              />
              {progress
                ? `Found ${progress.profiles_saved} of ${progress.profiles_total || "?"}`
                : "Starting…"}
            </span>
          )}
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-white transition-all"
            aria-label="Dismiss"
          >
            <Icon.X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {(isRunning || isDone) && (
        <div className="px-6 pt-4 pb-0">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "#ece2d0" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: isDone ? "#5e8d6a" : "#4a6f87",
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="px-6 py-5 flex items-start gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "#fee2e2", color: "#ef4444" }}
          >
            <Icon.Alert size={13} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-ink mb-1">
              {errorMessage ?? "Discovery failed"}
            </div>
            <div className="text-[12px] text-ink-3">
              {cards.length > 0
                ? `${cards.length} profiles were found before the error.`
                : "No profiles were saved."}
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton — shown while running with no cards yet */}
      {isRunning && cards.length === 0 && (
        <div className="px-6 py-5 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state — done but nothing found */}
      {(isDone || isError) && cards.length === 0 && (
        <div className="px-6 py-8 flex flex-col items-center text-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
            style={{ background: "#ece2d0", color: "#8e8170" }}
          >
            <Icon.Users size={18} />
          </div>
          <div className="text-[13px] font-medium text-ink-2">
            No INSEAD alumni found at {companyName}
          </div>
          <div className="text-[12px] text-ink-4">
            Try a different company name or broaden your filters.
          </div>
        </div>
      )}

      {/* Results list */}
      {cards.length > 0 && (
        <div className="px-6 py-4 flex flex-col gap-2">
          {cards.map((card) => (
            <DiscoveryContactRow
              key={card.id}
              card={card}
              onSave={onSave}
              onSkip={onSkip}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiscoveryContactRow
// ---------------------------------------------------------------------------

function DiscoveryContactRow({
  card,
  onSave,
  onSkip,
}: {
  card: DeckCard;
  onSave: (card: DeckCard) => void;
  onSkip: (card: DeckCard) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{
        borderColor: "#ece2d0",
        background: "#ffffff",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(31,27,22,0.06)";
        e.currentTarget.style.borderColor = "#d9cdb4";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#ece2d0";
      }}
    >
      <Avatar src={card.avatar} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-ink">{card.name}</span>
          {card.inseadShort && (
            <span
              className="inline-flex items-center px-1.5 h-[18px] rounded-full text-[10px] font-medium font-mono"
              style={{ background: "#f3e2cd", color: "#7a4a25", letterSpacing: "0.04em" }}
            >
              {card.inseadShort}
            </span>
          )}
          {card.tier && <TierBadge tier={card.tier} />}
        </div>
        {(card.role || card.company) && (
          <div className="text-[12px] text-ink-3 mt-0.5 truncate">
            {card.role}
            {card.role && card.company && " · "}
            {card.company}
          </div>
        )}
      </div>

      {card.linkedinUrl && (
        <a
          href={card.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{ color: "#0A66C2" }}
          title="View on LinkedIn"
        >
          <Icon.Link size={13} />
        </a>
      )}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onSave(card)}
          className="inline-flex items-center gap-1 px-3 h-7 rounded-full text-[12px] font-medium transition-all"
          style={{ background: "#4a6f87", color: "#ffffff" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#3d5e73";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4a6f87";
          }}
        >
          <Icon.HeartFill size={11} />
          Save
        </button>
        <button
          onClick={() => onSkip(card)}
          className="inline-flex items-center gap-1 px-3 h-7 rounded-full text-[12px] font-medium transition-all"
          style={{ background: "#f0ebe2", color: "#6b5e4a", border: "1px solid #d9cdb4" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#ece2d0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f0ebe2";
          }}
        >
          <Icon.X size={11} />
          Skip
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardSkeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: "#ece2d0" }}>
      <div className="w-10 h-10 rounded-full skeleton-pulse flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-32 rounded skeleton-pulse" />
        <div className="h-2.5 w-48 rounded skeleton-pulse" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-7 w-14 rounded-full skeleton-pulse" />
        <div className="h-7 w-14 rounded-full skeleton-pulse" />
      </div>
    </div>
  );
}
