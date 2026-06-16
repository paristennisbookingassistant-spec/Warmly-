"use client";

/**
 * components/v2/discover/TinderView.tsx
 * Full-viewport swipe deck workspace: card stack, queue banner, refine chat.
 * Ported from design/warmly-v2/project/js/screens/discover-tinder.jsx.
 */

import { useEffect, useRef, useState } from "react";
import { CHANNELS, type ChannelKey } from "../palette";
import { Icon } from "../icons";
import { Avatar, Btn, InseadPill, TierBadge } from "../primitives";
import type { LinkedInExperienceEntry, LinkedInEducationEntry } from "@/types/database";
import type { DeckCard, ChatMsg, ChatMsgAction, RefineResult, SearchHint } from "./types";

// ---------- Chat seed messages ----------

function seedChat(channel: ChannelKey): ChatMsg[] {
  if (channel === "cv") {
    return [
      {
        role: "agent",
        text: "I'm pushing real INSEAD alumni scored against your profile — PM roles in Paris / Berlin, AI & Tech focus.",
      },
      {
        role: "agent",
        text: "Save the ones worth a warm intro and skip the rest. Tell me to narrow or widen, e.g. \"consulting backgrounds\", \"Paris only\", or \"MBA26J cohort\".",
      },
    ];
  }
  return [
    {
      role: "agent",
      text: "Reading your synced LinkedIn connections and ranking them against your goals.",
    },
    {
      role: "agent",
      text: "Save or skip. Ask me to narrow: \"show only Paris\", \"VC connections\", \"product roles\".",
    },
  ];
}

// ---------- TinderView ----------

interface TinderViewProps {
  channel: ChannelKey;
  deck: DeckCard[];
  /** Show a subtle "scoring…" indicator when true */
  scoring?: boolean;
  /** Total count from the backend (for the door footer) */
  totalCount?: number;
  onBack: () => void;
  onSave: (card: DeckCard) => void;
  onSkip: (card: DeckCard) => void;
  /**
   * Called when the user sends a refine instruction.
   * Parent fetches/filters/re-ranks and updates deck via prop.
   * Returns either a plain reply string OR a RefineResult with an optional
   * action button to attach to the agent message.
   */
  onRefine?: (text: string) => Promise<string | RefineResult>;
  /**
   * Called when the user taps "Run live search at <Company>" in the refine chat.
   * Navigates back to the doors view and starts company discovery.
   */
  onLiveSearch?: (company: string, location?: string) => void;
}

export function TinderView({ channel, deck, scoring = false, onBack, onSave, onSkip, onRefine, onLiveSearch }: TinderViewProps) {
  const [idx, setIdx] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [swipe, setSwipe] = useState<{ dir: "left" | "right" } | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>(() => seedChat(channel));
  const [chatTyping, setChatTyping] = useState(false);
  const [searchHint, setSearchHint] = useState<SearchHint | null>(null);

  // Reset idx when deck changes (after a refine)
  const prevDeckRef = useRef<DeckCard[]>(deck);
  useEffect(() => {
    if (prevDeckRef.current !== deck) {
      setIdx(0);
      setSavedIds([]);
      setSkippedIds([]);
      setSwipe(null);
      prevDeckRef.current = deck;
    }
  }, [deck]);

  const current = deck[idx];
  const done = idx >= deck.length;

  const advance = () => {
    setSwipe(null);
    setIdx((i) => i + 1);
  };

  const handleSkip = () => {
    if (!current || swipe) return;
    setSkippedIds((s) => [...s, current.id]);
    onSkip(current);
    setSwipe({ dir: "left" });
    setTimeout(advance, 280);
  };

  const handleSave = () => {
    if (!current || swipe) return;
    setSavedIds((s) => [...s, current.id]);
    onSave(current);
    setSwipe({ dir: "right" });
    setTimeout(advance, 280);
  };

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    setChat((prev) => [...prev, { role: "user", text }]);
    setChatTyping(true);
    try {
      let agentMsg: ChatMsg;
      if (onRefine) {
        const result = await onRefine(text);
        if (typeof result === "string") {
          agentMsg = { role: "agent", text: result };
        } else {
          // RefineResult — may carry an inline action button
          agentMsg = { role: "agent", text: result.text, action: result.action };
        }
      } else {
        agentMsg = { role: "agent", text: "Got it — refining the queue." };
      }
      setChat((prev) => [...prev, agentMsg]);
      // Only show the "Refined" hint on the card when it's a genuine re-filter,
      // not when we're surfacing a live-search action (no deck change happened).
      if (!agentMsg.action) {
        setSearchHint({ label: "Refined", idx: 0 });
      }
    } catch {
      setChat((prev) => [...prev, { role: "agent", text: "Something went wrong while refining. Please try again." }]);
    } finally {
      setChatTyping(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <TopStrip channel={channel} scoring={scoring} onBack={onBack} />

      <div
        className="flex-1 mt-4 bg-white border rounded-3xl overflow-hidden flex min-h-0"
        style={{
          borderColor: "#e5d8be",
          boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 12px 32px rgba(31,27,22,0.06)",
        }}
      >
        {/* Left: card stage */}
        <div
          className="flex-1 flex flex-col relative min-w-0 overflow-hidden"
          style={{
            background:
              channel === "cv"
                ? "radial-gradient(circle at 50% 40%, #fdf8ec 0%, #faf2e0 75%)"
                : "radial-gradient(circle at 50% 40%, #f4f8fc 0%, #ecf1f6 75%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage:
                channel === "cv"
                  ? "radial-gradient(circle at 1px 1px, rgba(184,122,74,0.18) 1px, transparent 0)"
                  : "radial-gradient(circle at 1px 1px, rgba(74,111,135,0.20) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          <QueueBanner
            channel={channel}
            deck={deck}
            idx={idx}
            savedIds={savedIds}
            skippedIds={skippedIds}
          />

          {/* Card stage — pt-28 (112px) keeps background cards (translateY up to -66px) below the 84px banner with a visible gap */}
          <div className="flex-1 flex flex-col items-center px-10 relative z-10 min-h-0 overflow-hidden pt-28 pb-8">
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              {done ? (
                <EmptyDeck channel={channel} savedCount={savedIds.length} onBack={onBack} />
              ) : (
                <>
                  <CardStack
                    deck={deck}
                    idx={idx}
                    channel={channel}
                    swipe={swipe}
                    searchHint={searchHint}
                    scoring={scoring}
                  />
                  <div className="flex items-center gap-5 mt-7">
                    <SwipeBtn variant="skip" onClick={handleSkip} />
                    <SwipeBtn
                      variant="save"
                      channel={channel}
                      onClick={handleSave}
                      isWarmIntro={Boolean(current?.via)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <ChatSidebar
          channel={channel}
          messages={chat}
          typing={chatTyping}
          onSend={handleSendChat}
          onAction={onLiveSearch}
        />
      </div>
    </div>
  );
}

// ---------- TopStrip ----------

function TopStrip({ channel, scoring, onBack }: { channel: ChannelKey; scoring: boolean; onBack: () => void }) {
  return (
    <div className="flex items-center gap-4 flex-shrink-0">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors flex-shrink-0"
      >
        <Icon.ArrowLeft size={14} />
        Back to doors
      </button>
      <div className="w-px h-6" style={{ background: "#d9cdb4" }} />
      <ChannelChip channel={channel} />
      <div className="flex-1" />
      {scoring && (
        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3 hidden md:flex">
          <span className="inline-block w-[6px] h-[6px] rounded-full pulse-dot" style={{ background: "#b87a4a" }} />
          Scoring profiles…
        </div>
      )}
      {!scoring && (
        <div className="text-[11.5px] text-ink-4 hidden md:block">
          Tip: chat with your coach on the right to refine the queue.
        </div>
      )}
    </div>
  );
}

function ChannelChip({ channel }: { channel: ChannelKey }) {
  const c = CHANNELS[channel];
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 h-8 rounded-full"
      style={{ background: c.soft }}
    >
      {channel === "cv" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/v2/insead-logo.png" alt="INSEAD" className="h-4 w-auto object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/v2/linkedin-logo.png" alt="LinkedIn" className="h-3 w-auto object-contain" />
      )}
      <span className="text-[12px] font-medium" style={{ color: c.ink }}>
        {c.label}
      </span>
      <span
        className="inline-block w-[6px] h-[6px] rounded-full pulse-dot"
        style={{ background: "#5e8d6a" }}
      />
      <span className="text-[11px] text-ink-3">live</span>
    </div>
  );
}

// ---------- QueueBanner ----------

/** Two-letter initials for the small uniform queue tokens. */
function queueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function QueueBanner({
  channel,
  deck,
  idx,
  savedIds,
  skippedIds,
}: {
  channel: ChannelKey;
  deck: DeckCard[];
  idx: number;
  savedIds: string[];
  skippedIds: string[];
}) {
  const c = CHANNELS[channel];
  const remaining = deck.length - idx;

  return (
    <div
      className="relative z-10 px-7 border-b flex items-center gap-5 flex-shrink-0"
      style={{
        borderColor:
          channel === "cv" ? "rgba(184,122,74,0.18)" : "rgba(74,111,135,0.20)",
        height: 84,
      }}
    >
      <div className="inline-flex items-baseline gap-2 flex-shrink-0">
        <span
          className="font-display text-ink leading-none"
          style={{ fontSize: 36, fontStyle: "italic" }}
        >
          {remaining}
        </span>
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-ink-2 leading-tight">
            {channel === "cv" ? "alumni" : "leads"}
          </span>
          <span className="text-[11px] text-ink-3 leading-tight">left to screen</span>
        </div>
      </div>

      <div
        className="w-px h-10"
        style={{
          background:
            channel === "cv" ? "rgba(184,122,74,0.22)" : "rgba(74,111,135,0.24)",
        }}
      />

      {/* overflow-hidden so the single non-wrapping row of large tokens never
          spills over the saved/skipped counter on narrow panels. */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="font-mono-tag mb-1.5" style={{ fontSize: 9, color: c.accent }}>
          Queue
        </div>
        {/* Single row of larger tokens (batch capped at 10), no wrap. */}
        <div className="flex items-center gap-2">
          {deck.map((p, i) => {
            const isSaved = savedIds.includes(p.id);
            const isSkipped = skippedIds.includes(p.id);
            const isCurrent = i === idx;
            const size = isCurrent ? 38 : 32;

            // One cohesive palette — state only, no per-person rainbow.
            // Upcoming: soft cream token. Current: channel-accent ring.
            // Saved: filled accent. Skipped: faded dashed.
            let background = "var(--bg-sunk)";
            let color = "#b09a78";
            let border = "1px solid #e6dcc6";
            let boxShadow = "";
            let opacity = 1;

            if (isSaved) {
              background = c.accent;
              color = "#fff";
              border = `1px solid ${c.accent}`;
            } else if (isSkipped) {
              background = "transparent";
              color = "#c4b89e";
              border = "1px dashed #dccfb4";
              opacity = 0.45;
            } else if (isCurrent) {
              background = c.tint;
              color = c.accent;
              border = `1.5px solid ${c.accent}`;
              boxShadow = `0 0 0 3px ${c.tint}, 0 1px 2px rgba(0,0,0,0.05)`;
            }

            return (
              <div
                key={p.id}
                className="rounded-full flex-shrink-0 flex items-center justify-center select-none transition-all duration-300 font-semibold"
                style={{
                  width: size,
                  height: size,
                  background,
                  color,
                  border,
                  boxShadow,
                  opacity,
                  fontSize: isCurrent ? 14 : 12,
                  letterSpacing: "0.01em",
                }}
                title={p.name}
              >
                {queueInitials(p.name)}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="w-px h-10"
        style={{
          background:
            channel === "cv" ? "rgba(184,122,74,0.22)" : "rgba(74,111,135,0.24)",
        }}
      />

      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <div className="inline-flex items-center gap-1.5 text-[12.5px]">
          <Icon.HeartFill size={12} style={{ color: c.accent }} />
          <span className="text-ink-3">
            <strong className="text-ink">{savedIds.length}</strong> saved
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[12.5px]">
          <Icon.X size={12} className="text-ink-4" />
          <span className="text-ink-3">
            <strong className="text-ink-2">{skippedIds.length}</strong> skipped
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- CardStack ----------

function CardStack({
  deck,
  idx,
  channel,
  swipe,
  searchHint,
  scoring,
}: {
  deck: DeckCard[];
  idx: number;
  channel: ChannelKey;
  swipe: { dir: "left" | "right" } | null;
  searchHint: SearchHint | null;
  scoring: boolean;
}) {
  const cards = [];
  for (let d = 3; d >= 0; d--) {
    const card = deck[idx + d];
    if (!card) continue;
    cards.push(
      <ProfileCard
        key={card.id}
        card={card}
        channel={channel}
        depth={d}
        swipe={d === 0 ? swipe : null}
        searchHint={d === 0 && searchHint && searchHint.idx === idx ? searchHint : null}
        scoring={scoring}
      />
    );
  }
  return (
    <div className="relative w-full max-w-[460px] z-10" style={{ height: 540 }}>
      {cards}
    </div>
  );
}

// ---------- ProfileCard ----------

const DEPTH_STYLES: React.CSSProperties[] = [
  {},
  {
    transform: "scale(0.955) translateY(-24px)",
    filter: "saturate(0.85) brightness(0.985)",
    boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 10px 22px rgba(31,27,22,0.07)",
    background: "#faf3e6",
  },
  {
    transform: "scale(0.91) translateY(-46px)",
    filter: "saturate(0.7) brightness(0.97)",
    boxShadow: "0 1px 0 rgba(31,27,22,0.03), 0 6px 14px rgba(31,27,22,0.05)",
    background: "#f4ecdb",
  },
  {
    transform: "scale(0.865) translateY(-66px)",
    filter: "saturate(0.55) brightness(0.955)",
    opacity: 0.55,
    boxShadow: "0 1px 0 rgba(31,27,22,0.02), 0 3px 10px rgba(31,27,22,0.03)",
    background: "#efe6d0",
  },
];

function ProfileCard({
  card: p,
  channel,
  depth = 0,
  swipe,
  searchHint,
  scoring = false,
}: {
  card: DeckCard;
  channel: ChannelKey;
  depth?: number;
  swipe: { dir: "left" | "right" } | null;
  searchHint: SearchHint | null;
  scoring?: boolean;
}) {
  const c = CHANNELS[channel];
  const interactive = depth === 0;
  const [fullProfileOpen, setFullProfileOpen] = useState(false);

  let style: React.CSSProperties = {
    borderColor: "#e5d8be",
    boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 18px 44px rgba(31,27,22,0.12)",
    transition:
      "transform 280ms cubic-bezier(.2,.7,.3,1.2), opacity 280ms ease, filter 200ms ease, box-shadow 200ms ease",
    ...(DEPTH_STYLES[depth] ?? {}),
    zIndex: 10 - depth,
  };

  if (swipe?.dir === "left") {
    style = { ...style, transform: "translateX(-130%) rotate(-9deg)", opacity: 0 };
  } else if (swipe?.dir === "right") {
    style = { ...style, transform: "translateX(130%) rotate(9deg)", opacity: 0 };
  }

  const hasFullProfile =
    interactive && ((p.experience && p.experience.length > 0) || (p.education && p.education.length > 0));

  return (
    <>
      <div
        className="absolute inset-0 bg-white border rounded-3xl overflow-hidden flex flex-col"
        style={style}
      >
        {/* Source ribbon */}
        {p.via ? (
          // 2nd-degree warm-intro ribbon — steel-blue palette
          <div
            className="flex items-center gap-2 px-5 py-2.5 border-b flex-shrink-0"
            style={{ background: "#dde6ee", borderColor: "rgba(74,111,135,0.25)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/v2/linkedin-logo.png" alt="LinkedIn" className="h-3 w-auto object-contain" />
            <span className="text-ink-4">·</span>
            <Icon.Users size={12} style={{ color: "#2f4d63" }} />
            <span
              className="inline-flex items-center gap-1.5 px-2 h-[20px] rounded-full text-[10.5px] font-medium flex-shrink-0"
              style={{ background: "#4a6f87", color: "#ffffff" }}
            >
              via {p.via.peerName}
            </span>
            <div className="text-[11px] leading-tight flex-1 min-w-0 truncate" style={{ color: "#2f4d63" }}>
              · ask for a warm intro
            </div>
            <span
              className="text-[10px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md flex-shrink-0"
              style={{
                background: "#ffffff",
                color: "#2f4d63",
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              2nd
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-5 py-2.5 border-b flex-shrink-0"
            style={{ background: c.soft, borderColor: `${c.accent}33` }}
          >
            {channel === "linkedin" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/v2/linkedin-logo.png" alt="LinkedIn" className="h-3 w-auto object-contain" />
                <span className="text-ink-4">·</span>
                <div className="text-[11.5px] leading-tight flex-1 min-w-0 truncate" style={{ color: c.ink }}>
                  <span className="font-semibold">1st-degree connection</span>
                </div>
                <span
                  className="text-[10px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md"
                  style={{
                    background: "#ffffff",
                    color: c.ink,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  1st
                </span>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/v2/insead-logo.png" alt="INSEAD" className="h-4 w-auto object-contain" />
                <span className="text-ink-4">·</span>
                <Icon.Book size={12} style={{ color: c.accent }} />
                <div className="text-[11.5px] leading-tight flex-1" style={{ color: c.ink }}>
                  <span className="font-semibold">INSEAD CV book</span> · indexed alumnus
                </div>
                <span
                  className="text-[10px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md"
                  style={{
                    background: "#ffffff",
                    color: c.ink,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  1st
                </span>
              </>
            )}
          </div>
        )}

        {/* Identity */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-start gap-4">
            <Avatar src={p.avatar} name={p.name} size={68} />
            <div className="flex-1 min-w-0 pt-1">
              <div
                className="font-display text-[20px] text-ink leading-tight"
                style={{ fontStyle: "italic" }}
              >
                {p.name}
              </div>
              {p.role && (
                <div className="text-[13.5px] text-ink-2 mt-1 truncate">{p.role}</div>
              )}
              {(p.company || p.location) && (
                <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">
                  {p.company}
                  {p.company && p.location && " · "}
                  {p.location && (
                    <span className="inline-flex items-baseline gap-1">
                      <Icon.MapPin size={10} className="translate-y-[1px]" />
                      {p.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {p.inseadShort && <InseadPill>{p.inseadShort}</InseadPill>}
            {p.tier && <TierBadge tier={p.tier} />}
            {searchHint && (
              <span
                className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-medium"
                style={{ background: "#f3e2cd", color: "#7a4a25" }}
              >
                <Icon.Sparkles size={10} />
                {searchHint.label}
              </span>
            )}
          </div>
        </div>

        {/* Rationale — show the "scoring" loading state ONLY while scoring is
            actively running (not a warm-intro, no tier yet). Once scoring ends,
            fall through to the rationale/ribbon so a slow/failed score never
            leaves the card stuck on "Scoring…" forever. */}
        {p.tier === null && !p.via && scoring ? (
          <div className="px-6 py-2 flex-1 overflow-hidden">
            <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>
              Why I&apos;m pushing them
            </div>
            <div className="flex items-center gap-2 text-[13px] text-ink-3">
              <span
                className="rounded-full pulse-dot inline-block flex-shrink-0"
                style={{ width: 7, height: 7, background: c.accent }}
              />
              Scoring this match against your profile&hellip;
            </div>
            <div className="mt-2.5 space-y-1.5" aria-hidden>
              <div className="h-2.5 rounded shimmering" style={{ width: "92%" }} />
              <div className="h-2.5 rounded shimmering" style={{ width: "78%" }} />
            </div>
          </div>
        ) : p.rationale ? (
          <div className="px-6 py-2 flex-1 overflow-hidden">
            <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>
              Why I&apos;m pushing them
            </div>
            <p className="text-[13px] text-ink-2 leading-relaxed">{p.rationale}</p>
          </div>
        ) : null}

        {/* About */}
        {p.about.length > 0 && (
          <div className="px-6 pb-3">
            <div className="font-mono-tag text-ink-4 mb-1.5" style={{ fontSize: 9.5 }}>
              About
            </div>
            <ul className="flex flex-col gap-1">
              {p.about.map((a, i) => (
                <li key={i} className="text-[12.5px] text-ink-2 flex items-baseline gap-2.5">
                  <span
                    className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
                    style={{ background: c.accent }}
                  />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 py-2.5 border-t flex items-center justify-between gap-2 flex-shrink-0"
          style={{ borderColor: "#ece2d0", background: "#fcf8ee" }}
        >
          {p.linkedinUrl ? (
            <a
              href={p.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-medium transition-colors"
              style={{
                background: "#ffffff",
                color: "#0A66C2",
                border: "1px solid #d9cdb4",
                pointerEvents: interactive ? "auto" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f6fc";
                e.currentTarget.style.borderColor = "#0A66C2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#d9cdb4";
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/v2/linkedin-logo.png" alt="" className="h-2.5 w-auto object-contain" />
              View on LinkedIn
              <Icon.ArrowRight size={11} />
            </a>
          ) : (
            <span />
          )}

          {hasFullProfile ? (
            <button
              onClick={() => setFullProfileOpen(true)}
              className="text-[12px] text-ink-3 hover:text-ink inline-flex items-center gap-1 transition-colors"
            >
              Full profile
              <Icon.ChevronRight size={12} />
            </button>
          ) : (
            <span className="text-[12px] text-ink-4 inline-flex items-center gap-1 cursor-default select-none">
              Full profile
              <Icon.ChevronRight size={12} />
            </span>
          )}
        </div>
      </div>

      {/* Full profile overlay — rendered outside the card to escape overflow:hidden */}
      {fullProfileOpen && interactive && (
        <FullProfileOverlay
          card={p}
          channel={channel}
          onClose={() => setFullProfileOpen(false)}
        />
      )}
    </>
  );
}

// ---------- FullProfileOverlay ----------

function FullProfileOverlay({
  card: p,
  channel,
  onClose,
}: {
  card: DeckCard;
  channel: ChannelKey;
  onClose: () => void;
}) {
  const c = CHANNELS[channel];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(31,27,22,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl overflow-hidden flex flex-col"
        style={{
          width: 480,
          maxHeight: "80vh",
          border: "1px solid #e5d8be",
          boxShadow: "0 4px 6px rgba(31,27,22,0.04), 0 24px 64px rgba(31,27,22,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0"
          style={{ background: c.soft, borderColor: `${c.accent}33` }}
        >
          <Avatar src={p.avatar} name={p.name} size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold text-ink leading-tight truncate">{p.name}</div>
            {p.role && <div className="text-[13px] text-ink-2 truncate mt-0.5">{p.role}</div>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-ink-3 hover:text-ink"
            style={{ background: "rgba(31,27,22,0.06)" }}
          >
            <Icon.X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {p.experience && p.experience.length > 0 && (
            <ExperienceSection entries={p.experience} accent={c.accent} />
          )}
          {p.education && p.education.length > 0 && (
            <EducationSection entries={p.education} accent={c.accent} />
          )}
          {(!p.experience || p.experience.length === 0) && (!p.education || p.education.length === 0) && (
            <div className="text-[13px] text-ink-4 text-center py-8">No additional profile data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- ExperienceSection ----------

const PREVIEW_COUNT = 2;

function ExperienceSection({
  entries,
  accent,
}: {
  entries: LinkedInExperienceEntry[];
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, PREVIEW_COUNT);
  const hiddenCount = entries.length - PREVIEW_COUNT;

  return (
    <div>
      <div className="font-mono-tag text-ink-4 mb-3" style={{ fontSize: 9.5 }}>
        Experience
      </div>
      <ul className="flex flex-col gap-3">
        {visible.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${accent}18` }}
            >
              <Icon.Briefcase size={12} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-ink leading-snug">{e.title}</div>
              <div className="text-[12px] text-ink-2 mt-0.5">{e.company}</div>
              {(e.dateRange.start ?? e.dateRange.end) && (
                <div className="text-[11px] text-ink-4 mt-0.5">
                  {e.dateRange.start ?? ""}
                  {e.dateRange.start && e.dateRange.end ? " – " : ""}
                  {e.dateRange.end ?? (e.dateRange.start ? "present" : "")}
                </div>
              )}
              {e.description && (
                <p className="text-[12px] text-ink-3 mt-1 leading-relaxed line-clamp-3">{e.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {entries.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: accent }}
        >
          {expanded ? (
            <>Show less <Icon.ChevronUp size={12} /></>
          ) : (
            <>Show {hiddenCount} more <Icon.ChevronDown size={12} /></>
          )}
        </button>
      )}
    </div>
  );
}

// ---------- EducationSection ----------

function EducationSection({
  entries,
  accent,
}: {
  entries: LinkedInEducationEntry[];
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, PREVIEW_COUNT);
  const hiddenCount = entries.length - PREVIEW_COUNT;

  return (
    <div>
      <div className="font-mono-tag text-ink-4 mb-3" style={{ fontSize: 9.5 }}>
        Education
      </div>
      <ul className="flex flex-col gap-3">
        {visible.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${accent}18` }}
            >
              <Icon.GraduationCap size={12} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-ink leading-snug">{e.school}</div>
              {e.degree && <div className="text-[12px] text-ink-2 mt-0.5">{e.degree}</div>}
              {e.fieldOfStudy && <div className="text-[12px] text-ink-3 mt-0.5">{e.fieldOfStudy}</div>}
              {(e.dateRange.start ?? e.dateRange.end) && (
                <div className="text-[11px] text-ink-4 mt-0.5">
                  {e.dateRange.start ?? ""}
                  {e.dateRange.start && e.dateRange.end ? " – " : ""}
                  {e.dateRange.end ?? (e.dateRange.start ? "present" : "")}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {entries.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: accent }}
        >
          {expanded ? (
            <>Show less <Icon.ChevronUp size={12} /></>
          ) : (
            <>Show {hiddenCount} more <Icon.ChevronDown size={12} /></>
          )}
        </button>
      )}
    </div>
  );
}

// ---------- SwipeBtn ----------

function SwipeBtn({
  variant,
  channel,
  onClick,
  isWarmIntro,
}: {
  variant: "save" | "skip";
  channel?: ChannelKey;
  onClick: () => void;
  /** When true, the Save button reads "Ask for intro" instead of "Save". */
  isWarmIntro?: boolean;
}) {
  const isSave = variant === "save";
  const c = channel ? CHANNELS[channel] : CHANNELS.cv;
  // Warm-intro saves use a steel-blue accent to visually match the "via" chip.
  const saveBackground = isWarmIntro ? "#4a6f87" : c.accent;
  const saveShadow = isWarmIntro ? "0 8px 22px rgba(74,111,135,0.28)" : `0 8px 22px ${c.tint}`;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.04] focus-ring"
      style={{
        background: isSave ? saveBackground : "#ffffff",
        color: isSave ? "#ffffff" : "#6b5e4a",
        border: isSave ? "none" : "1px solid #d9cdb4",
        width: isWarmIntro && isSave ? 196 : 168,
        height: 52,
        borderRadius: 999,
        boxShadow: isSave
          ? saveShadow
          : "0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.04)",
      }}
    >
      {isSave ? <Icon.Users size={17} /> : <Icon.X size={17} />}
      <span className="text-[14px] font-medium">
        {isSave ? (isWarmIntro ? "Ask for intro" : "Save") : "Skip"}
      </span>
      <span className="text-[11px] opacity-60 ml-1">{isSave ? "→" : "←"}</span>
    </button>
  );
}

// ---------- EmptyDeck ----------

function EmptyDeck({
  channel,
  savedCount,
  onBack,
}: {
  channel: ChannelKey;
  savedCount: number;
  onBack: () => void;
}) {
  const c = CHANNELS[channel];
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 max-w-[440px] relative z-10">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: c.soft, color: c.accent }}
      >
        <Icon.Check size={28} />
      </div>
      <div
        className="font-display text-[24px] text-ink mb-2"
        style={{ fontStyle: "italic" }}
      >
        You&apos;ve seen the queue.
      </div>
      <p className="text-[14px] text-ink-3 mb-7 leading-relaxed">
        {savedCount > 0
          ? `${savedCount} new contact${savedCount > 1 ? "s" : ""} saved. Ask the coach in chat to push more profiles tailored to a specific angle, or head back to the doors.`
          : "No saves this round. Tell the coach in chat to refine, try \"find someone with go-to-market experience\" or \"anyone hiring sponsorship-friendly PMs.\""}
      </p>
      <Btn onClick={onBack} icon={Icon.ArrowLeft} variant="secondary">
        Back to doors
      </Btn>
    </div>
  );
}

// ---------- ChatSidebar ----------

function ChatSidebar({
  channel,
  messages,
  typing,
  onSend,
  onAction,
}: {
  channel: ChannelKey;
  messages: ChatMsg[];
  typing: boolean;
  onSend: (text: string) => void | Promise<void>;
  /** Handles action buttons embedded in agent messages (e.g. live company search) */
  onAction?: (company: string, location?: string) => void;
}) {
  const c = CHANNELS[channel];
  const [val, setVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!val.trim()) return;
    void onSend(val);
    setVal("");
  };

  const suggestions =
    channel === "cv"
      ? ["Consulting backgrounds", "VC / investing", "Paris only", "MBA26J cohort"]
      : ["Paris only", "In VC / investing", "Product roles", "Consulting backgrounds"];

  return (
    <aside
      className="border-l flex flex-col min-h-0 flex-shrink-0"
      style={{ borderColor: "#e5d8be", background: "#fdfaf3", width: 380 }}
    >
      {/* Header */}
      <div
        className="px-4 border-b flex items-center gap-2.5 flex-shrink-0"
        style={{ borderColor: "#ece2d0", height: 84 }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: c.soft, color: c.accent }}
        >
          <Icon.Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink leading-tight">
            Refine with your coach
          </div>
          <div className="text-[10.5px] text-ink-4 flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-[6px] h-[6px] rounded-full pulse-dot"
              style={{ background: "#5e8d6a" }}
            />
            Searching {channel === "cv" ? "INSEAD directory" : "peer networks"} live
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0"
      >
        {messages.map((m, i) => (
          <ChatMessage key={i} msg={m} channel={channel} onAction={onAction} />
        ))}
        {typing && <ChatTyping channel={channel} />}
      </div>

      {/* Suggestion chips */}
      {messages.length <= 2 && !typing && (
        <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div className="font-mono-tag text-ink-4" style={{ fontSize: 9 }}>
            Try
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                className="text-[11.5px] px-2.5 h-7 rounded-full border text-ink-2 hover:bg-white transition-colors text-left"
                style={{ borderColor: "#d9cdb4", background: "#ffffff" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={submit}
        className="border-t p-3 flex-shrink-0"
        style={{ borderColor: "#ece2d0" }}
      >
        <div
          className="flex items-center gap-2 bg-white rounded-xl border px-3 py-2"
          style={{ borderColor: "#d9cdb4" }}
        >
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="e.g. find someone with GTM experience"
            className="flex-1 text-[12.5px] text-ink-2 placeholder:text-ink-4 outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={!val.trim()}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: val.trim() ? c.accent : "#ece2d0",
              color: val.trim() ? "#ffffff" : "#8e8170",
            }}
          >
            <Icon.Send size={12} />
          </button>
        </div>
      </form>
    </aside>
  );
}

function ChatMessage({
  msg,
  channel,
  onAction,
}: {
  msg: ChatMsg;
  channel: ChannelKey;
  onAction?: (company: string, location?: string) => void;
}) {
  const c = CHANNELS[channel];
  if (msg.role === "user") {
    return (
      <div
        className="self-end max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug"
        style={{ background: "#1f1b16", color: "#f4ede0", borderBottomRightRadius: 4 }}
      >
        {msg.text}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[92%] flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: c.soft, color: c.accent }}
      >
        <Icon.Sparkles size={12} />
      </div>
      <div
        className="rounded-2xl text-[13px] leading-relaxed text-ink-2 overflow-hidden"
        style={{
          background: "#ffffff",
          borderBottomLeftRadius: 4,
          border: "1px solid #ece2d0",
        }}
      >
        <p className="px-3.5 py-2.5" style={{ whiteSpace: "pre-wrap" }}>
          {msg.text}
        </p>
        {msg.action?.type === "live_company_search" && onAction && (
          <LiveSearchButton
            action={msg.action}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
}

// ---------- LiveSearchButton ----------

function LiveSearchButton({
  action,
  onAction,
}: {
  action: ChatMsgAction;
  onAction: (company: string, location?: string) => void;
}) {
  return (
    <div
      className="px-3.5 pb-3 pt-1 border-t"
      style={{ borderColor: "#ece2d0" }}
    >
      <button
        onClick={() => onAction(action.company, action.location)}
        className="inline-flex items-center gap-2 px-3 h-8 rounded-lg text-[12px] font-medium transition-all hover:opacity-90 active:scale-[0.97]"
        style={{
          background: "#dde6ee",
          color: "#2a5270",
          border: "1px solid #c2d4e0",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#c8d9e6";
          e.currentTarget.style.borderColor = "#4a6f87";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#dde6ee";
          e.currentTarget.style.borderColor = "#c2d4e0";
        }}
      >
        <Icon.Search size={11} />
        {action.label}
      </button>
    </div>
  );
}

function ChatTyping({ channel }: { channel: ChannelKey }) {
  const c = CHANNELS[channel];
  return (
    <div className="self-start flex items-start gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: c.soft, color: c.accent }}
      >
        <Icon.Sparkles size={12} />
      </div>
      <div
        className="px-3.5 py-3 rounded-2xl"
        style={{
          background: "#ffffff",
          borderBottomLeftRadius: 4,
          border: "1px solid #ece2d0",
        }}
      >
        <div className="flex items-center gap-1">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="inline-block w-[6px] h-[6px] rounded-full pulse-dot"
              style={{ background: c.accent, animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
