/**
 * extension/popup/Popup.tsx
 * Minimal, polished popup UI (320 × 400 px).
 *
 * States:
 *   - Unauthenticated → sign-in prompt
 *   - Idle           → session count, Start button
 *   - Active session → progress bar, Pause / Stop
 *   - Paused         → Resume / Stop
 *   - Rate limited   → countdown message
 *   - Completed      → summary + View in App
 *
 * No React Router — pure conditional rendering.
 * Colors: #1a1a2e dark sidebar, #3b82f6 accent blue, #10b981 success green.
 */

import { useState, useEffect, useCallback } from "react";
import type { DiscoverySessionState } from "../shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PopupView =
  | "loading"
  | "unauthenticated"
  | "idle"
  | "active"
  | "paused"
  | "rate_limited"
  | "completed";

interface PopupState {
  view: PopupView;
  userName: string | null;
  session: DiscoverySessionState | null;
  isOnLinkedInProfile: boolean;
  /** Sessions used today */
  sessionsToday: number;
  /** Total sessions allowed per day */
  maxSessionsPerDay: number;
  /** ms until rate limit clears */
  rateLimitWaitMs: number | null;
  /** Profiles discovered in the last completed session */
  lastSessionProfiles: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWaitTime(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Styles (inline — no build step required for CSS-in-JS at this scale)
// ---------------------------------------------------------------------------

const S = {
  root: {
    width: "320px",
    minHeight: "160px",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    backgroundColor: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    fontSize: "13px",
    color: "#111827",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    flexShrink: 0,
  },
  brandName: {
    fontWeight: 600,
    fontSize: "13px",
    color: "#111827",
  },
  subtext: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "1px",
  },
  linkBtn: {
    fontSize: "11px",
    color: "#3b82f6",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    textDecoration: "none",
  },
  divider: {
    height: "1px",
    backgroundColor: "#f3f4f6",
    margin: "0 -16px",
  },
  sessionCard: {
    backgroundColor: "#eff6ff",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  sessionCardPaused: {
    backgroundColor: "#fffbeb",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  sessionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  badge: (color: string, bg: string) => ({
    display: "inline-block",
    fontSize: "10px",
    fontWeight: 600,
    color,
    backgroundColor: bg,
    borderRadius: "4px",
    padding: "1px 6px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  }),
  progressText: {
    fontSize: "12px",
    color: "#1d4ed8",
    fontWeight: 500,
  },
  progressTrack: {
    height: "5px",
    backgroundColor: "#bfdbfe",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  progressFill: (pct: number) => ({
    height: "100%",
    width: `${Math.min(100, pct)}%`,
    backgroundColor: "#3b82f6",
    borderRadius: "9999px",
    transition: "width 0.4s ease",
  }),
  btnRow: {
    display: "flex",
    gap: "8px",
    marginTop: "2px",
  },
  btnPrimary: {
    flex: 1,
    padding: "7px 12px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnSecondary: {
    flex: 1,
    padding: "7px 12px",
    backgroundColor: "#ffffff",
    color: "#3b82f6",
    border: "1.5px solid #bfdbfe",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "7px 10px",
    backgroundColor: "transparent",
    color: "#ef4444",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  btnFull: {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  btnOutline: {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: "#ffffff",
    color: "#374151",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  rateLimitCard: {
    backgroundColor: "#fef9c3",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "12px",
    color: "#92400e",
    lineHeight: 1.5,
  },
  completedCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  completedCount: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#10b981",
    lineHeight: 1,
  },
  sessionMeta: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "2px",
  },
  bookmarkBtn: {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: "#ffffff",
    color: "#374151",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Popup() {
  const [ps, setPs] = useState<PopupState>({
    view: "loading",
    userName: null,
    session: null,
    isOnLinkedInProfile: false,
    sessionsToday: 0,
    maxSessionsPerDay: 2,
    rateLimitWaitMs: null,
    lastSessionProfiles: null,
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // ---- Load state on mount ----
  useEffect(() => {
    // Check auth
    chrome.runtime.sendMessage({ type: "AUTH_CHECK" }, (response) => {
      const authed = Boolean(response?.user_id);
      setPs((prev) => ({
        ...prev,
        view: authed ? "loading" : "unauthenticated",
        userName: response?.user_name ?? null,
      }));

      if (authed) {
        // Check rate limit
        chrome.runtime.sendMessage({ type: "CHECK_RATE_LIMIT" }, (rl) => {
          // Load session state
          chrome.storage.local.get("discovery_session", (res) => {
            const rawSession = res.discovery_session as DiscoverySessionState | undefined;

            // Determine view
            let view: PopupView = "idle";
            if (rawSession) {
              if (rawSession.status === "running") view = "active";
              else if (rawSession.status === "paused") view = "paused";
              else if (rawSession.status === "completed") view = "completed";
            }

            if (rl && rl.allowed === false) {
              view = "rate_limited";
            }

            setPs((prev) => ({
              ...prev,
              view,
              session: rawSession ?? null,
              sessionsToday: rl?.state?.sessionsToday ?? 0,
              rateLimitWaitMs: rl?.waitMs ?? null,
            }));
          });
        });

        // Check if on a LinkedIn profile page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const url = tabs[0]?.url ?? "";
          setPs((prev) => ({
            ...prev,
            isOnLinkedInProfile: url.includes("linkedin.com/in/"),
          }));
        });
      }
    });

    // Listen for progress updates from orchestrator
    const listener = (msg: { type: string; data?: unknown }) => {
      if (msg.type === "SESSION_PROGRESS") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic
        const data = msg.data as any;
        setPs((prev) => {
          if (!prev.session) return prev;
          return {
            ...prev,
            session: {
              ...prev.session,
              profiles_viewed: data?.profilesVisited ?? prev.session.profiles_viewed,
              status:
                data?.state === "COMPLETED"
                  ? "completed"
                  : data?.state === "PAUSED"
                  ? "paused"
                  : "running",
            },
            view:
              data?.state === "COMPLETED"
                ? "completed"
                : data?.state === "PAUSED"
                ? "paused"
                : "active",
            lastSessionProfiles:
              data?.state === "COMPLETED"
                ? data?.profilesDiscovered ?? null
                : prev.lastSessionProfiles,
          };
        });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ---- Handlers ----
  const handleStartDiscovery = useCallback(() => {
    // Open the web app to start a configured discovery session
    chrome.tabs.create({ url: `${getWebAppUrl()}/chat` });
  }, []);

  const handlePause = useCallback(() => {
    chrome.runtime.sendMessage({ type: "PAUSE_DISCOVERY" });
    setPs((prev) => ({
      ...prev,
      view: "paused",
      session: prev.session
        ? { ...prev.session, status: "paused" }
        : null,
    }));
  }, []);

  const handleResume = useCallback(() => {
    chrome.runtime.sendMessage({ type: "RESUME_DISCOVERY" });
    setPs((prev) => ({
      ...prev,
      view: "active",
      session: prev.session
        ? { ...prev.session, status: "running" }
        : null,
    }));
  }, []);

  const handleStop = useCallback(() => {
    chrome.runtime.sendMessage({ type: "STOP_DISCOVERY" });
    setPs((prev) => ({
      ...prev,
      view: "completed",
      lastSessionProfiles: prev.session?.profiles_saved ?? null,
    }));
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "PAGE_BOOKMARKED" },
          (response) => {
            if (response?.ok) {
              setSavedMsg("Saved to contacts!");
            } else {
              setSavedMsg("Could not extract profile");
            }
            setTimeout(() => setSavedMsg(null), 3000);
          }
        );
      }
    } finally {
      setSaving(false);
    }
  }, []);

  function getWebAppUrl(): string {
    // In production this would come from chrome.storage; default to localhost for dev
    return "http://localhost:3000";
  }

  // ---- Render ----
  const { view, session, userName, sessionsToday, maxSessionsPerDay, rateLimitWaitMs, lastSessionProfiles, isOnLinkedInProfile } = ps;

  if (view === "loading") {
    return (
      <div style={{ ...S.root, alignItems: "center", justifyContent: "center", minHeight: "80px" }}>
        <span style={{ fontSize: "12px", color: "#9ca3af" }}>Loading...</span>
      </div>
    );
  }

  if (view === "unauthenticated") {
    return (
      <div style={S.root}>
        <div style={S.header}>
          <div style={S.brandRow}>
            <div style={S.dot} />
            <span style={S.brandName}>AI Networking Coach</span>
          </div>
        </div>
        <div style={S.divider} />
        <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
          Sign in to start discovering and saving LinkedIn contacts.
        </p>
        <button
          style={S.btnFull}
          onClick={() => chrome.tabs.create({ url: `${getWebAppUrl()}/login` })}
        >
          Sign in to AI Networking Coach
        </button>
      </div>
    );
  }

  const profilesViewed = session?.profiles_viewed ?? 0;
  const progressPct = (profilesViewed / 25) * 100;

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.brandRow}>
            <div style={S.dot} />
            <span style={S.brandName}>AI Networking Coach</span>
          </div>
          {userName && <p style={S.subtext}>{userName}</p>}
        </div>
        <button
          style={S.linkBtn}
          onClick={() => chrome.tabs.create({ url: getWebAppUrl() })}
        >
          Open app
        </button>
      </div>

      <div style={S.divider} />

      {/* Rate limited */}
      {view === "rate_limited" && (
        <div style={S.rateLimitCard}>
          <strong>Daily limit reached.</strong>
          {rateLimitWaitMs !== null && (
            <span> Come back in {formatWaitTime(rateLimitWaitMs)}.</span>
          )}
          <p style={{ marginTop: "4px", fontSize: "11px" }}>
            You can run {maxSessionsPerDay} discovery sessions per day.
          </p>
        </div>
      )}

      {/* Active session */}
      {view === "active" && session && (
        <div style={S.sessionCard}>
          <div style={S.sessionLabel}>
            <span style={S.badge("#1d4ed8", "#dbeafe")}>Discovering</span>
          </div>
          <p style={S.progressText}>
            {profilesViewed} / 25 profiles
          </p>
          <div style={S.progressTrack}>
            <div style={S.progressFill(progressPct)} />
          </div>
          <div style={S.btnRow}>
            <button style={S.btnSecondary} onClick={handlePause}>
              Pause
            </button>
            <button style={S.btnDanger} onClick={handleStop}>
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Paused session */}
      {view === "paused" && session && (
        <div style={S.sessionCardPaused}>
          <div style={S.sessionLabel}>
            <span style={S.badge("#92400e", "#fef3c7")}>Paused</span>
          </div>
          <p style={{ fontSize: "12px", color: "#78350f" }}>
            {profilesViewed} / 25 profiles visited
          </p>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill(progressPct), backgroundColor: "#f59e0b" }} />
          </div>
          <div style={S.btnRow}>
            <button style={S.btnPrimary} onClick={handleResume}>
              Resume
            </button>
            <button style={S.btnDanger} onClick={handleStop}>
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Completed */}
      {view === "completed" && (
        <div style={S.completedCard}>
          <span style={S.badge("#065f46", "#d1fae5")}>Session complete</span>
          {lastSessionProfiles !== null && (
            <div style={{ marginTop: "4px" }}>
              <p style={S.completedCount}>{lastSessionProfiles}</p>
              <p style={{ fontSize: "12px", color: "#374151", marginTop: "2px" }}>
                profiles discovered
              </p>
            </div>
          )}
          <button
            style={{ ...S.btnPrimary, marginTop: "4px" }}
            onClick={() => chrome.tabs.create({ url: `${getWebAppUrl()}/contacts` })}
          >
            View in App
          </button>
        </div>
      )}

      {/* Idle */}
      {view === "idle" && (
        <>
          <div>
            <button style={S.btnFull} onClick={handleStartDiscovery}>
              Start Discovery
            </button>
            <p style={{ ...S.sessionMeta, marginTop: "6px", textAlign: "center" }}>
              {sessionsToday} / {maxSessionsPerDay} sessions used today
            </p>
          </div>
        </>
      )}

      {/* Save current profile (when on a LinkedIn /in/ page) */}
      {isOnLinkedInProfile && (view === "idle" || view === "active" || view === "paused" || view === "completed" || view === "rate_limited") && (
        <>
          <div style={S.divider} />
          <button
            style={S.bookmarkBtn}
            onClick={handleSaveProfile}
            disabled={saving}
          >
            {savedMsg
              ? savedMsg
              : saving
              ? "Saving..."
              : "Save this profile to contacts"}
          </button>
        </>
      )}
    </div>
  );
}
