"use client";

/**
 * components/v2/discover/Doors.tsx
 * DoorsView: the two-door chooser — INSEAD Directory + LinkedIn Network.
 * Ported pixel-faithfully from design/warmly-v2/project/js/screens/discover.jsx.
 *
 * Phase 3b addition: "Discover at a company" affordance button that opens
 * the validate-criteria card (Module 3). Lives below the two door cards.
 */

import { CHANNELS, type ChannelKey } from "../palette";
import { Icon } from "../icons";
import { SYNCED_PEERS, type SyncedPeer } from "./seed";

// ---------- User scope (seed values) ----------
const USER_SCOPE = {
  role: "Product Manager",
  industry: "AI / Tech",
  geography: ["Paris", "Berlin"],
};

// ---------- DoorsView ----------

interface DoorsViewProps {
  linkedInConnected: boolean;
  linkedInPendingCount: number;
  cvQueueCount: number;
  onOpenCV: () => void;
  onOpenLinkedIn: () => void;
  /** Opens the validate-criteria card for live company discovery */
  onOpenCompanyDiscover: () => void;
}

export function DoorsView({
  linkedInConnected,
  linkedInPendingCount,
  cvQueueCount,
  onOpenCV,
  onOpenLinkedIn,
  onOpenCompanyDiscover,
}: DoorsViewProps) {
  return (
    <div className="fade-up flex flex-col flex-1 min-h-0">
      {/* Header row */}
      <div className="flex items-end justify-between gap-6 mb-5 flex-shrink-0 flex-wrap">
        <div className="max-w-[640px]">
          <div className="font-mono-tag text-ink-3 mb-1.5">Discover</div>
          <h1
            className="font-display text-[28px] leading-[1.1] text-ink"
            style={{ fontStyle: "italic" }}
          >
            Two channels to find your next warm intro.
          </h1>
          <p className="text-[13.5px] text-ink-3 leading-relaxed mt-1.5">
            Pick a door. Your coach pushes profiles one at a time, save or skip, and chat to refine.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono-tag text-ink-4 mb-1" style={{ fontSize: 9.5 }}>
            Your scope
          </div>
          <div className="text-ink-2 text-[12.5px]">
            <span className="font-medium">{USER_SCOPE.role}</span> ·{" "}
            <span className="font-medium">{USER_SCOPE.industry}</span>
          </div>
          <div className="text-ink-3 text-[12px]">
            {USER_SCOPE.geography.join(" / ")}{" "}
            <button className="ml-1 hover:underline" style={{ color: CHANNELS.cv.ink }}>
              edit
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0">
        <CVDoor queueCount={cvQueueCount} onClick={onOpenCV} />
        <LinkedInDoor
          queueCount={linkedInConnected ? linkedInPendingCount : SYNCED_PEERS.length}
          connected={linkedInConnected}
          onClick={onOpenLinkedIn}
          peers={SYNCED_PEERS}
        />
      </div>

      {/* Module 3 entry point: Discover at a company */}
      <CompanyDiscoverAffordance onClick={onOpenCompanyDiscover} />
    </div>
  );
}

// ---------- CompanyDiscoverAffordance ----------

function CompanyDiscoverAffordance({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-between mt-4 flex-shrink-0">
      <div className="h-px flex-1" style={{ background: "#ece2d0" }} />
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 mx-4 px-4 h-9 rounded-full text-[12.5px] font-medium transition-all"
        style={{
          background: "#ffffff",
          color: "#4a6f87",
          border: "1px solid #d9cdb4",
          boxShadow: "0 1px 3px rgba(31,27,22,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#dde6ee";
          e.currentTarget.style.borderColor = "#4a6f87";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(74,111,135,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = "#d9cdb4";
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(31,27,22,0.04)";
        }}
      >
        <Icon.Search size={13} />
        Discover at a company
        <Icon.ArrowRight size={13} />
      </button>
      <div className="h-px flex-1" style={{ background: "#ece2d0" }} />
    </div>
  );
}

// ---------- INSEAD Door ----------

function CVDoor({ queueCount, onClick }: { queueCount: number; onClick: () => void }) {
  const c = CHANNELS.cv;
  return (
    <DoorShell channel="cv" onClick={onClick}>
      <DoorHero>
        <BrandRow>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v2/insead-logo.png" alt="INSEAD" className="h-10 w-auto object-contain object-left" />
          <DoorStatus ok text="Connected · refreshed 2h ago" />
        </BrandRow>
        <div className="font-mono-tag mt-5" style={{ color: c.accent }}>
          Door 1 · Primary channel
        </div>
        <h2
          className="font-display text-[28px] text-ink leading-[1.05] mt-1.5 mb-2"
          style={{ fontStyle: "italic" }}
        >
          INSEAD Directory
        </h2>
        <p className="text-[13.5px] text-ink-2 leading-relaxed" style={{ maxWidth: 360 }}>
          Vetted alumni indexed straight from the official MBA &amp; MIM CV books, every match
          confirmed by class, employer and graduation year.
        </p>
      </DoorHero>

      <DoorVisualBand channel="cv">
        <DirectoryPreview />
      </DoorVisualBand>

      <DoorFooter
        channel="cv"
        bigNumber={queueCount}
        bigLabel="alumni in your queue"
        meta={[
          { label: "Source",    value: "INSEAD MBA + MIM CV books" },
          { label: "Indexed",   value: "12,400 alumni globally" },
          { label: "Refreshed", value: "2 hours ago" },
        ]}
        cta="Open INSEAD Directory"
      />
    </DoorShell>
  );
}

// ---------- LinkedIn Door ----------

function LinkedInDoor({
  queueCount,
  connected,
  onClick,
  peers,
}: {
  queueCount: number;
  connected: boolean;
  onClick: () => void;
  peers: SyncedPeer[];
}) {
  const c = CHANNELS.linkedin;
  return (
    <DoorShell channel="linkedin" onClick={onClick}>
      <DoorHero>
        <BrandRow>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v2/linkedin-logo.png" alt="LinkedIn" className="h-7 w-auto object-contain object-left" />
          {connected ? (
            <DoorStatus ok text="Connected · refreshed just now" />
          ) : (
            <DoorStatus text="Setup required" />
          )}
        </BrandRow>
        <div className="font-mono-tag mt-5" style={{ color: c.accent }}>
          Door 2 · Network channel
        </div>
        <h2
          className="font-display text-[28px] text-ink leading-[1.05] mt-1.5 mb-2"
          style={{ fontStyle: "italic" }}
        >
          LinkedIn Network
        </h2>
        <p className="text-[13.5px] text-ink-2 leading-relaxed" style={{ maxWidth: 360 }}>
          Your 1st-degree connections synced via the Warmly Chrome extension, ranked by
          relevance to your networking goals.
        </p>
      </DoorHero>

      <DoorVisualBand channel="linkedin">
        <NetworkPreview peers={peers} />
      </DoorVisualBand>

      <DoorFooter
        channel="linkedin"
        bigNumber={queueCount}
        bigLabel={connected ? "1st-degree leads queued" : "peers ready to sync"}
        meta={[
          { label: "Source",    value: "Warmly Chrome extension" },
          { label: "Peers",     value: `${peers.length} of your class synced` },
          { label: "Refreshed", value: connected ? "Just now" : "Awaiting setup" },
        ]}
        cta={connected ? "Open LinkedIn Network" : "Set up LinkedIn channel"}
      />
    </DoorShell>
  );
}

// ---------- DoorShell ----------

function DoorShell({
  channel,
  onClick,
  children,
}: {
  channel: ChannelKey;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const c = CHANNELS[channel];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-3xl transition-all duration-200 relative overflow-hidden flex flex-col bg-white h-full"
      style={{
        border: "1px solid #e5d8be",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c.accent;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${c.accent} inset, 0 18px 44px ${c.tint}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e5d8be";
        e.currentTarget.style.boxShadow = "0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)";
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: c.accent }} />
      {children}
    </button>
  );
}

function DoorHero({ children }: { children: React.ReactNode }) {
  return <div className="px-7 pt-7 pb-5 flex-shrink-0">{children}</div>;
}

function BrandRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between h-12">{children}</div>;
}

function DoorStatus({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 h-[24px] rounded-full"
      style={{
        background: ok ? "#dcebd9" : "#ece2d0",
        color: ok ? "#34553e" : "#6b5e4a",
      }}
    >
      <span
        className="inline-block w-[6px] h-[6px] rounded-full"
        style={{ background: ok ? "#5e8d6a" : "#8e8170" }}
      />
      {text}
    </span>
  );
}

function DoorVisualBand({
  channel,
  children,
}: {
  channel: ChannelKey;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex-1 flex items-center justify-center px-7 py-4 border-y relative overflow-hidden min-h-0"
      style={{
        background: channel === "cv" ? "#fbf5ea" : "#f1f5f9",
        borderColor: "#ece2d0",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            channel === "cv"
              ? "radial-gradient(circle at 1px 1px, rgba(184,122,74,0.15) 1px, transparent 0)"
              : "radial-gradient(circle at 1px 1px, rgba(74,111,135,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

interface MetaRow {
  label: string;
  value: string;
}

function DoorFooter({
  channel,
  bigNumber,
  bigLabel,
  meta,
  cta,
}: {
  channel: ChannelKey;
  bigNumber: number;
  bigLabel: string;
  meta: MetaRow[];
  cta: string;
}) {
  const c = CHANNELS[channel];
  return (
    <div className="px-7 pt-5 pb-6 flex-shrink-0">
      <div className="flex items-baseline gap-3 mb-3">
        <div
          className="font-display leading-none"
          style={{ fontSize: 44, color: c.ink, fontStyle: "italic" }}
        >
          {bigNumber}
        </div>
        <div className="text-[13px] text-ink-3">{bigLabel}</div>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        {meta.map((m) => (
          <div key={m.label} className="flex items-baseline gap-3 text-[12px]">
            <span
              className="font-mono-tag text-ink-4 w-[72px] flex-shrink-0"
              style={{ fontSize: 9 }}
            >
              {m.label}
            </span>
            <span className="text-ink-2">{m.value}</span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between px-4 h-11 rounded-xl transition-all group-hover:scale-[1.01]"
        style={{ background: c.accent, color: "#ffffff" }}
      >
        <span className="text-[13.5px] font-medium">{cta}</span>
        <Icon.ArrowRight size={15} />
      </div>
    </div>
  );
}

// ---------- Directory preview (INSEAD) ----------

function DirectoryPreview() {
  const samples = [
    {
      name: "Anna Schmidt",
      role: "Sr PM · Parloa",
      insead: "MBA 22D",
      avatar: "https://i.pravatar.cc/120?u=warmly-deck-anna",
    },
    {
      name: "Liu Wei",
      role: "PM · Anthropic",
      insead: "MBA 24D",
      avatar: "https://i.pravatar.cc/120?u=warmly-deck-liu",
    },
    {
      name: "Camille Dubois",
      role: "Lead PM · Mistral",
      insead: "MBA 21D",
      avatar: "https://i.pravatar.cc/120?u=warmly-deck-camille",
    },
    {
      name: "Tomás Reyes",
      role: "Sr PM · Hugging Face",
      insead: "MBA 23D",
      avatar: "https://i.pravatar.cc/120?u=warmly-deck-tomas",
    },
  ];

  const rotations = ["-1.5deg", "1deg", "1deg", "-0.5deg"];

  return (
    <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 380 }}>
      {samples.map((s, i) => (
        <div
          key={s.name}
          className="bg-white border rounded-xl p-3 flex items-center gap-2.5"
          style={{
            borderColor: "#e5d8be",
            boxShadow: "0 1px 0 rgba(31,27,22,0.03), 0 2px 8px rgba(31,27,22,0.04)",
            transform: `rotate(${rotations[i]})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold text-ink leading-tight truncate">
              {s.name}
            </div>
            <div className="text-[10px] text-ink-3 mt-0.5 truncate">{s.role}</div>
            <div
              className="mt-1 inline-flex items-center px-1.5 h-[14px] rounded-full text-[9px] font-medium"
              style={{
                background: "#f3e2cd",
                color: "#7a4a25",
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: "0.04em",
              }}
            >
              {s.insead}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Network preview (LinkedIn) ----------

export function NetworkPreview({ peers }: { peers: SyncedPeer[] }) {
  const W = 360;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;
  const peerR = 110;

  const peerPositions = [
    { x: cx - peerR * 0.92, y: cy - peerR * 0.5 },
    { x: cx + peerR * 0.92, y: cy - peerR * 0.5 },
    { x: cx,                y: cy + peerR * 0.95 },
  ];

  const secondDegree = peerPositions.map((p) => {
    const angle = Math.atan2(p.y - cy, p.x - cx);
    return [
      { x: p.x + Math.cos(angle) * 50 - 10, y: p.y + Math.sin(angle) * 50 - 18 },
      { x: p.x + Math.cos(angle) * 60,       y: p.y + Math.sin(angle) * 60 + 10 },
      { x: p.x + Math.cos(angle) * 45 + 18,  y: p.y + Math.sin(angle) * 45 + 24 },
    ];
  });

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg width={W} height={H} className="absolute inset-0" style={{ pointerEvents: "none" }}>
        {peerPositions.map((p, i) => (
          <line
            key={`up-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="#4a6f87" strokeWidth={1.5} opacity={0.55} strokeLinecap="round"
          />
        ))}
        {peerPositions.map((p, i) =>
          secondDegree[i].map((s, j) => (
            <line
              key={`sd-${i}-${j}`}
              x1={p.x} y1={p.y} x2={s.x} y2={s.y}
              stroke="#4a6f87" strokeWidth={1} opacity={0.25} strokeLinecap="round"
            />
          ))
        )}
        {secondDegree.flat().map((s, i) => (
          <circle key={`s-${i}`} cx={s.x} cy={s.y} r={4.5} fill="#4a6f87" opacity={0.45} />
        ))}
      </svg>

      {peerPositions.map((p, i) => (
        <div
          key={`peer-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: p.x - 22,
            top: p.y - 22,
            width: 44,
            height: 44,
            boxShadow: "0 4px 14px rgba(74,111,135,0.25), 0 0 0 2px #ffffff",
            border: "2px solid #4a6f87",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={peers[i]?.avatar}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-ink-2 font-medium whitespace-nowrap">
            {peers[i]?.short}
          </div>
        </div>
      ))}

      <div
        className="absolute rounded-full"
        style={{
          left: cx - 30,
          top: cy - 30,
          width: 60,
          height: 60,
          boxShadow: "0 6px 18px rgba(31,27,22,0.18), 0 0 0 3px #ffffff",
          border: "2px solid #1f1b16",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://i.pravatar.cc/120?u=warmly-user-liyang"
          alt=""
          className="w-full h-full rounded-full object-cover"
        />
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-ink font-semibold whitespace-nowrap">
          You
        </div>
      </div>
    </div>
  );
}
