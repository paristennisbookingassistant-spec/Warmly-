"use client";

/**
 * SyncCardStates.tsx
 * State cards (A/B/C/detecting) rendered by LinkedInSyncCard.tsx.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-6 py-6 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-soft)" }}
    >
      {children}
    </div>
  );
}

function Btn({
  onClick,
  children,
  variant = "primary",
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const s: React.CSSProperties = variant === "primary"
    ? { background: "var(--ink)", color: "var(--bg)" }
    : { background: "transparent", color: "var(--ink-3)", border: "1px solid var(--line)" };
  return (
    <button
      className="rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      style={s}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// State A: not installed
// ---------------------------------------------------------------------------

export function NotInstalledCard({ onDetect }: { onDetect: () => void }) {
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Install the Warmly browser extension
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          We use it to read your LinkedIn network from your existing browser session. No password
          needed. Read-only.
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Btn onClick={() => window.open("https://chrome.google.com/webstore", "_blank", "noopener,noreferrer")}>
          Install extension
        </Btn>
        <Btn variant="secondary" onClick={onDetect}>Already installed? Detect</Btn>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// State B: not logged into LinkedIn
// ---------------------------------------------------------------------------

export function NotLoggedInCard({ onRecheck }: { onRecheck: () => void }) {
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Log into LinkedIn first
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          Open LinkedIn in another tab and sign in. Then come back here.
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Btn onClick={() => window.open("https://www.linkedin.com/login", "_blank", "noopener,noreferrer")}>
          Open LinkedIn
        </Btn>
        <Btn variant="secondary" onClick={onRecheck}>I&rsquo;m logged in now</Btn>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// State C: ready
// ---------------------------------------------------------------------------

export function ReadyCard({ onSync, loading }: { onSync: () => void; loading: boolean }) {
  return (
    <CardShell>
      <div>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Ready to sync your network
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          We&rsquo;ll bring in up to 2,500 contacts with their work history, education, and
          location. Takes about 20 minutes. Keep this tab open.
        </p>
      </div>
      <div className="flex justify-end">
        <Btn onClick={onSync} disabled={loading}>
          {loading ? "Starting..." : "Sync my network"}
        </Btn>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Detecting
// ---------------------------------------------------------------------------

export function DetectingCard() {
  return (
    <CardShell>
      <div className="flex items-center gap-3">
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--ink-3)", borderTopColor: "transparent" }}
        />
        <p className="text-[13px]" style={{ color: "var(--ink-3)" }}>
          Looking for the Warmly extension...
        </p>
      </div>
    </CardShell>
  );
}
