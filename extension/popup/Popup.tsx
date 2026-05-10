/**
 * extension/popup/Popup.tsx
 * Warmly extension popup UI (320 × 400 px).
 *
 * States:
 *   - Unauthenticated → sign-in prompt
 *   - Idle           → discovery form (company + hint + school + where + doing)
 *   - Active session → progress bar, Pause / Stop
 *   - Paused         → Resume / Stop
 *   - Rate limited   → countdown message
 *   - Completed      → top picks with rationale + View in App
 *   - Picker         → low-confidence company disambiguation (overlays idle)
 *
 * Design tokens mirror src/app/globals.css (cream + sienna):
 *   --bg #f4ede0 · --ink #1f1b16 · --ink-3 #6b5e4a · --accent #b87a4a · --line-soft #d9cdb4
 */

import { useState, useEffect, useCallback } from "react";
import type { DiscoverySessionState } from "../shared/types";
import { LOCATION_GEO_URN, FUNCTION_KEYWORDS } from "../shared/linkedin-filters";

// Injected at build time by esbuild — see build.mjs
declare const __BACKEND_URL__: string;
declare const __IS_DEV__: boolean;

// Show CDP debug panel only in dev builds (localhost backend).
// `__IS_DEV__` is a compile-time constant set by esbuild's `define`, so the
// dev-only JSX block is dead-code-eliminated from production bundles entirely.
const IS_DEV = typeof __IS_DEV__ !== "undefined" ? __IS_DEV__ : false;

// ---------------------------------------------------------------------------
// Warmly tokens (kept in sync with src/app/globals.css)
// ---------------------------------------------------------------------------

const T = {
  bg: "#f4ede0",
  bgSunk: "#ece2d0",
  surface: "#ffffff",
  surface2: "#faf4e8",
  line: "#cdbf9f",
  lineSoft: "#d9cdb4",

  ink: "#1f1b16",
  ink2: "#3d352c",
  ink3: "#6b5e4a",
  ink4: "#8e8170",

  accent: "#b87a4a",
  accentSoft: "#f3e2cd",
  accentInk: "#7a4a25",

  good: "#5e8d6a",
  goodSoft: "#dcebd9",
  goodInk: "#34553e",

  warn: "#c8923a",
  warnSoft: "#f6e7c5",
  warnInk: "#7a521a",

  bad: "#c25c4a",
};

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
  /** Ranked picks with one-line rationale, populated on completion */
  lastSessionRankings: SessionRanking[] | null;
}

/** A single ranked candidate from /api/ai/rank-batch surfaced in the popup. */
interface SessionRanking {
  contact_id: string;
  rank: number;
  score: number;
  tier: 1 | 2 | 3;
  reasoning: string;
  hook: string;
  /** Display data — fetched separately by the popup after the rankings arrive. */
  name?: string;
  current_title?: string;
  company?: string;
}

/** A company candidate the LLM disambiguator surfaces when confidence is low. */
interface CompanyPickerCandidate {
  name: string;
  tagline?: string;
  location?: string;
  followers?: string;
  slug: string;
  url?: string;
  /** Raw row text scraped from LinkedIn — used to render multi-line preview. */
  rawText?: string;
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
    backgroundColor: T.bg,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    fontSize: "13px",
    color: T.ink,
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
    backgroundColor: T.accent,
    flexShrink: 0,
  },
  brandName: {
    fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif",
    fontStyle: "italic" as const,
    fontWeight: 400,
    fontSize: "20px",
    letterSpacing: "-0.01em",
    color: T.ink,
    lineHeight: 1,
  },
  subtext: {
    fontSize: "11px",
    color: T.ink3,
    marginTop: "3px",
  },
  linkBtn: {
    fontSize: "11px",
    color: T.accent,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0",
    textDecoration: "none",
    fontWeight: 500,
  },
  divider: {
    height: "1px",
    backgroundColor: T.lineSoft,
    margin: "0 -16px",
  },
  sessionCard: {
    backgroundColor: T.accentSoft,
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  sessionCardPaused: {
    backgroundColor: T.warnSoft,
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
    color: T.accentInk,
    fontWeight: 500,
  },
  progressTrack: {
    height: "5px",
    backgroundColor: "#e8d6bc",
    borderRadius: "9999px",
    overflow: "hidden",
  },
  progressFill: (pct: number) => ({
    height: "100%",
    width: `${Math.min(100, pct)}%`,
    backgroundColor: T.accent,
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
    backgroundColor: T.accent,
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
    backgroundColor: T.surface,
    color: T.accentInk,
    border: `1px solid ${T.line}`,
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "7px 10px",
    backgroundColor: "transparent",
    color: T.bad,
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  btnFull: {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: T.accent,
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
    backgroundColor: T.surface,
    color: T.ink2,
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
  },
  rateLimitCard: {
    backgroundColor: T.warnSoft,
    borderRadius: "10px",
    padding: "12px",
    fontSize: "12px",
    color: T.warnInk,
    lineHeight: 1.5,
  },
  completedCard: {
    backgroundColor: T.goodSoft,
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  completedCount: {
    fontSize: "22px",
    fontWeight: 700,
    color: T.goodInk,
    lineHeight: 1,
  },
  sessionMeta: {
    fontSize: "11px",
    color: T.ink3,
    marginTop: "2px",
  },
  bookmarkBtn: {
    width: "100%",
    padding: "9px 12px",
    backgroundColor: T.surface,
    color: T.ink2,
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "8px",
    outline: "none",
    color: T.ink,
    backgroundColor: T.surface,
    boxSizing: "border-box" as const,
  },
  hintInput: {
    width: "100%",
    padding: "7px 10px",
    fontSize: "12px",
    border: `1px solid ${T.line}`,
    borderRadius: "8px",
    outline: "none",
    color: T.ink2,
    backgroundColor: T.accentSoft,
    boxSizing: "border-box" as const,
  },
  fieldLabel: {
    fontSize: "10px",
    color: T.ink3,
    fontWeight: 500,
    display: "block",
    marginBottom: "2px",
    paddingLeft: "2px",
  },
  fieldHint: {
    color: T.ink4,
    fontWeight: 400,
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  filterLabel: {
    fontSize: "11px",
    color: T.ink3,
    whiteSpace: "nowrap" as const,
    minWidth: "44px",
  },
  select: {
    flex: 1,
    padding: "5px 8px",
    fontSize: "12px",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "6px",
    color: T.ink,
    backgroundColor: T.surface,
    cursor: "pointer",
  },
  pickerCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    padding: "10px",
    border: `1px solid ${T.line}`,
    borderRadius: "10px",
    backgroundColor: T.surface2,
  },
  pickerRow: {
    textAlign: "left" as const,
    padding: "8px 10px",
    fontSize: "11.5px",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "8px",
    backgroundColor: T.surface,
    cursor: "pointer",
    color: T.ink,
  },
  rankingsRow: {
    textAlign: "left" as const,
    padding: "8px 10px",
    border: `1px solid ${T.lineSoft}`,
    borderRadius: "8px",
    backgroundColor: T.surface,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    gap: "3px",
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
    lastSessionRankings: null,
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyHint, setCompanyHint] = useState(""); // user context to disambiguate
  const [schoolId, setSchoolId] = useState("5176"); // INSEAD default
  const [locationKey, setLocationKey] = useState(""); // "" = any
  const [functionKey, setFunctionKey] = useState(""); // "" = any
  const [companyPicker, setCompanyPicker] = useState<{
    candidates: CompanyPickerCandidate[];
    reasoning: string | null;
  } | null>(null);
  // Dev-only CDP debug state
  const [cdpTestResult, setCdpTestResult] = useState<string | null>(null);
  const [testCompany, setTestCompany] = useState("");
  const [companyIdResult, setCompanyIdResult] = useState<string | null>(null);
  const [discoverResult, setDiscoverResult] = useState<string | null>(null);

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

        // Check if any LinkedIn profile tab is open.
        // In real Chrome the active tab behind the popup is returned first;
        // the fallback to all tabs handles Playwright E2E tests and edge cases.
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
          const activeUrl = activeTabs[0]?.url ?? "";
          if (activeUrl.includes("linkedin.com/in/")) {
            setPs((prev) => ({ ...prev, isOnLinkedInProfile: true }));
          } else {
            chrome.tabs.query({ url: "*://www.linkedin.com/in/*" }, (linkedinTabs) => {
              setPs((prev) => ({ ...prev, isOnLinkedInProfile: linkedinTabs.length > 0 }));
            });
          }
        });
      }
    });

    // Listen for progress updates from orchestrator
    const listener = (msg: { type: string; data?: unknown }) => {
      if (msg.type === "SESSION_PROGRESS") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic
        const data = msg.data as any;
        const rankingsFromMsg = (data?.rankings as SessionRanking[] | undefined) ?? null;

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
            lastSessionRankings:
              data?.state === "COMPLETED"
                ? rankingsFromMsg ?? prev.lastSessionRankings
                : prev.lastSessionRankings,
          };
        });

        // After rankings arrive, fetch each contact's display data so we
        // can show "Name · role at company" alongside the rationale.
        if (data?.state === "COMPLETED" && Array.isArray(rankingsFromMsg) && rankingsFromMsg.length > 0) {
          chrome.runtime.sendMessage(
            { type: "FETCH_CONTACTS_FOR_RANKINGS", payload: { ids: rankingsFromMsg.map((r) => r.contact_id) } },
            (resp: { ok: boolean; contacts?: Array<{ id: string; name: string; current_title: string | null; company: string | null }> }) => {
              if (chrome.runtime.lastError || !resp?.ok || !resp.contacts) return;
              const byId = new Map(resp.contacts.map((c) => [c.id, c]));
              setPs((prev) => ({
                ...prev,
                lastSessionRankings: prev.lastSessionRankings?.map((r) => {
                  const c = byId.get(r.contact_id);
                  return c
                    ? { ...r, name: c.name, current_title: c.current_title ?? undefined, company: c.company ?? undefined }
                    : r;
                }) ?? null,
              }));
            }
          );
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // ---- Handlers ----
  // Production discovery flow: popup → service worker (CDP_DISCOVER) →
  // resolves company via LLM disambiguation, navigates to the school-filtered
  // alumni search URL via Chrome DevTools Protocol, visits each profile,
  // extracts via MiniMax, saves, and runs batch ranking.
  const handleStartDiscovery = useCallback(async () => {
    if (!companyName.trim()) return;

    // Confirm a LinkedIn tab is open — CDP needs one to attach to.
    const tabs = await chrome.tabs.query({ url: "*://www.linkedin.com/*" });
    const linkedInTab = tabs[0];
    if (!linkedInTab?.id) {
      setSavedMsg("Open LinkedIn first");
      setTimeout(() => setSavedMsg(null), 3000);
      return;
    }

    const sessionId = crypto.randomUUID();
    setPs((prev) => ({
      ...prev,
      view: "active",
      session: {
        session_id: sessionId,
        user_id: "",
        status: "running",
        profiles_viewed: 0,
        profiles_scored: 0,
        profiles_saved: 0,
        target_companies: [companyName.trim()],
        current_company_index: 0,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        completed_companies: [],
        processed_urls: [],
      },
    }));

    const locationGeoUrn = locationKey
      ? LOCATION_GEO_URN[locationKey]?.geoUrn
      : undefined;
    const functionKeywords = functionKey
      ? FUNCTION_KEYWORDS[functionKey]?.keywords
      : undefined;

    chrome.runtime.sendMessage(
      {
        type: "CDP_DISCOVER",
        payload: {
          companyName: companyName.trim(),
          schoolId: schoolId || "5176",
          userContext: companyHint.trim() || undefined,
          locationGeoUrn,
          functionKeywords,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          setSavedMsg("Discovery failed to start. Reload the extension.");
          setTimeout(() => setSavedMsg(null), 4000);
          setPs((prev) => ({ ...prev, view: "idle" }));
          return;
        }
        if (response?.ok === false) {
          // If the LLM couldn't pick a confident company, surface the picker.
          if (response.needsPicker && Array.isArray(response.candidates)) {
            setCompanyPicker({
              candidates: response.candidates as CompanyPickerCandidate[],
              reasoning: response.reasoning ?? null,
            });
            setPs((prev) => ({ ...prev, view: "idle" }));
            return;
          }
          setSavedMsg(response.error ?? "Discovery failed");
          setTimeout(() => setSavedMsg(null), 5000);
          setPs((prev) => ({ ...prev, view: "idle" }));
        }
      }
    );
  }, [companyName, companyHint, schoolId, locationKey, functionKey]);

  /**
   * User picked a candidate from the disambiguation UI. Re-run discovery
   * with the picked company name and slug so the SW bypasses resolution.
   */
  const handlePickCompany = useCallback(
    (cand: CompanyPickerCandidate) => {
      setCompanyPicker(null);
      setCompanyName(cand.name);
      setCompanyHint(cand.tagline ?? companyHint);

      const sessionId = crypto.randomUUID();
      setPs((prev) => ({
        ...prev,
        view: "active",
        session: {
          session_id: sessionId,
          user_id: "",
          status: "running",
          profiles_viewed: 0,
          profiles_scored: 0,
          profiles_saved: 0,
          target_companies: [cand.name],
          current_company_index: 0,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          completed_companies: [],
          processed_urls: [],
        },
      }));

      const locationGeoUrn = locationKey
        ? LOCATION_GEO_URN[locationKey]?.geoUrn
        : undefined;
      const functionKeywords = functionKey
        ? FUNCTION_KEYWORDS[functionKey]?.keywords
        : undefined;

      chrome.runtime.sendMessage(
        {
          type: "CDP_DISCOVER",
          payload: {
            companyName: cand.name,
            companySlug: cand.slug,
            schoolId: schoolId || "5176",
            userContext: cand.tagline ?? companyHint.trim() ?? undefined,
            locationGeoUrn,
            functionKeywords,
          },
        },
        (response) => {
          if (chrome.runtime.lastError || response?.ok === false) {
            setSavedMsg(response?.error ?? "Discovery failed");
            setTimeout(() => setSavedMsg(null), 5000);
            setPs((prev) => ({ ...prev, view: "idle" }));
          }
        }
      );
    },
    [companyHint, schoolId, locationKey, functionKey]
  );

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
    setSavedMsg("Reading profile...");
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = activeTabs[0];
    const targetTab = activeTab?.url?.includes("linkedin.com/in/")
      ? activeTab
      : (await chrome.tabs.query({ url: "*://www.linkedin.com/in/*" }))[0];
    if (!targetTab?.id) {
      setSaving(false);
      setSavedMsg(null);
      return;
    }
    chrome.tabs.sendMessage(
      targetTab.id,
      { type: "PAGE_BOOKMARKED" },
      (response) => {
        setSaving(false);
        if (chrome.runtime.lastError) {
          setSavedMsg("Refresh the LinkedIn page first");
        } else if (response?.ok) {
          setSavedMsg("Saved to contacts!");
        } else if (response?.reason === "not_a_profile_page") {
          setSavedMsg("Not a profile page");
        } else if (response?.reason === "save_failed") {
          setSavedMsg("Sign in to the web app first");
        } else {
          setSavedMsg("Could not read this profile");
        }
        setTimeout(() => setSavedMsg(null), 4000);
      }
    );
  }, []);

  function getWebAppUrl(): string {
    return typeof __BACKEND_URL__ !== "undefined" ? __BACKEND_URL__ : "http://localhost:3000";
  }

  // ---- Render ----
  const { view, session, userName, sessionsToday, maxSessionsPerDay, rateLimitWaitMs, lastSessionProfiles, isOnLinkedInProfile } = ps;

  if (view === "loading") {
    return (
      <div style={{ ...S.root, alignItems: "center", justifyContent: "center", minHeight: "80px" }}>
        <span style={{ fontSize: "12px", color: T.ink4 }}>Loading...</span>
      </div>
    );
  }

  if (view === "unauthenticated") {
    return (
      <div style={S.root}>
        <div style={S.header}>
          <div style={S.brandRow}>
            <div style={S.dot} className="warmly-pulse" />
            <span style={S.brandName} className="warmly-wordmark">Warmly</span>
          </div>
        </div>
        <div style={S.divider} />
        <p style={{ fontSize: "12px", color: T.ink3, lineHeight: 1.6 }}>
          Sign in to start discovering and saving LinkedIn contacts.
        </p>
        <button
          style={S.btnFull}
          onClick={() => chrome.tabs.create({ url: `${getWebAppUrl()}/login` })}
        >
          Sign in to Warmly
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
            <div style={S.dot} className="warmly-pulse" />
            <span style={S.brandName} className="warmly-wordmark">Warmly</span>
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
            <span style={S.badge(T.accentInk, "#eccfa9")}>Discovering</span>
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
            <span style={S.badge(T.warnInk, "#eed6a8")}>Paused</span>
          </div>
          <p style={{ fontSize: "12px", color: T.warnInk }}>
            {profilesViewed} / 25 profiles visited
          </p>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill(progressPct), backgroundColor: T.warn }} />
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
          <span style={S.badge(T.goodInk, "#c5dfc1")}>Session complete</span>
          {lastSessionProfiles !== null && (
            <div style={{ marginTop: "4px" }}>
              <p style={S.completedCount}>{lastSessionProfiles}</p>
              <p style={{ fontSize: "12px", color: T.ink2, marginTop: "2px" }}>
                profiles discovered
              </p>
            </div>
          )}

          {/* Top picks with rationale */}
          {ps.lastSessionRankings && ps.lastSessionRankings.length > 0 && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: T.ink3, fontWeight: 600 }}>
                Top picks for you
              </p>
              {ps.lastSessionRankings
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 5)
                .map((r) => (
                  <button
                    key={r.contact_id}
                    onClick={() => chrome.tabs.create({ url: `${getWebAppUrl()}/contacts/${r.contact_id}` })}
                    style={S.rankingsRow}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{ fontSize: "10px", color: T.ink4, fontFamily: "ui-monospace, monospace", minWidth: "14px" }}>
                        {r.rank}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: T.ink, flex: 1 }}>
                        {r.name ?? "(loading…)"}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          backgroundColor: r.tier === 1 ? T.goodSoft : r.tier === 2 ? T.warnSoft : T.bgSunk,
                          color: r.tier === 1 ? T.goodInk : r.tier === 2 ? T.warnInk : T.ink3,
                          fontWeight: 600,
                        }}
                      >
                        T{r.tier}
                      </span>
                    </div>
                    {(r.current_title || r.company) && (
                      <div style={{ fontSize: "11px", color: T.ink3, paddingLeft: "20px" }}>
                        {r.current_title ?? ""}
                        {r.current_title && r.company ? " · " : ""}
                        {r.company ?? ""}
                      </div>
                    )}
                    {r.reasoning && (
                      <div style={{ fontSize: "10.5px", color: T.ink2, paddingLeft: "20px", lineHeight: 1.4, fontStyle: "italic" }}>
                        {r.reasoning}
                      </div>
                    )}
                  </button>
                ))}
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

      {/* Company picker — surfaced when LLM confidence is low */}
      {view === "idle" && companyPicker && (
        <div style={S.pickerCard}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 600, color: T.ink, marginBottom: "2px" }}>
              Which one did you mean?
            </p>
            <p style={{ fontSize: "10.5px", color: T.ink3, lineHeight: 1.4 }}>
              {companyPicker.reasoning ?? "Multiple matches found — pick the right company."}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {companyPicker.candidates.slice(0, 5).map((c) => {
              const lines = (c.rawText ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
              return (
                <button
                  key={c.slug}
                  onClick={() => handlePickCompany(c)}
                  style={S.pickerRow}
                >
                  <div style={{ fontWeight: 600, marginBottom: "2px", color: T.ink }}>{c.name}</div>
                  {c.tagline && (
                    <div style={{ fontSize: "10.5px", color: T.ink3, lineHeight: 1.35 }}>
                      {c.tagline}
                    </div>
                  )}
                  {!c.tagline && lines.length > 1 && (
                    <div style={{ fontSize: "10.5px", color: T.ink3, lineHeight: 1.35 }}>
                      {lines.slice(1, 3).join(" · ")}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: T.ink4, marginTop: "2px" }}>
                    {[c.location, c.followers].filter(Boolean).join(" · ")}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCompanyPicker(null)}
            style={{
              alignSelf: "flex-start",
              fontSize: "10.5px",
              color: T.ink3,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            None of these — let me re-type
          </button>
        </div>
      )}

      {/* Idle — Discovery form */}
      {view === "idle" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: T.ink }}>
              Find alumni at a company
            </p>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name (e.g. McKinsey)"
              style={S.input}
              onKeyDown={(e) => e.key === "Enter" && handleStartDiscovery()}
            />
            <div>
              <label style={S.fieldLabel}>
                What does the company do? <span style={S.fieldHint}>(helps when name is generic)</span>
              </label>
              <input
                value={companyHint}
                onChange={(e) => setCompanyHint(e.target.value)}
                placeholder='e.g. "AI agent startup", "Paris VC fund"'
                style={S.hintInput}
                onKeyDown={(e) => e.key === "Enter" && handleStartDiscovery()}
              />
            </div>
            <div style={S.filterRow}>
              <label style={S.filterLabel}>School:</label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                style={S.select}
              >
                <option value="5176">INSEAD</option>
                <option value="1219">Harvard Business School</option>
                <option value="1552">London Business School</option>
                <option value="1792">Stanford GSB</option>
                <option value="1285">Wharton</option>
                <option value="">Any school</option>
              </select>
            </div>
            <div style={S.filterRow}>
              <label style={S.filterLabel}>Where:</label>
              <select
                value={locationKey}
                onChange={(e) => setLocationKey(e.target.value)}
                style={S.select}
              >
                <option value="">Any location</option>
                {Object.entries(LOCATION_GEO_URN).map(([k, { label }]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div style={S.filterRow}>
              <label style={S.filterLabel}>Doing:</label>
              <select
                value={functionKey}
                onChange={(e) => setFunctionKey(e.target.value)}
                style={S.select}
              >
                <option value="">Any function</option>
                {Object.entries(FUNCTION_KEYWORDS).map(([k, { label }]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <button
              style={{
                ...S.btnFull,
                opacity: companyName.trim() ? 1 : 0.5,
                cursor: companyName.trim() ? "pointer" : "not-allowed",
              }}
              onClick={handleStartDiscovery}
              disabled={!companyName.trim()}
            >
              Start Discovery
            </button>
            <p style={{ ...S.sessionMeta, textAlign: "center" }}>
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

      {/*
        CDP debug panel — DEV ONLY. Hidden in production builds.
        The "Discover INSEAD alumni" button below hardcodes schoolId "5176"
        and goes through a separate CDP-based test path used during Module 1-3
        development. The real production flow is the "Start Discovery" button
        in the idle view above. Do not rely on this panel for real discovery.
      */}
      {IS_DEV && (
        <>
          <div style={S.divider} />
          <p style={{ fontSize: "10px", color: T.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Dev tools
          </p>
          <button
            style={{ ...S.linkBtn, fontSize: "10px", color: T.ink4 }}
            onClick={() => {
              setCdpTestResult("Testing CDP...");
              chrome.runtime.sendMessage({ type: "CDP_TEST" }, (res) => {
                if (res?.ok) {
                  setCdpTestResult(`CDP works! Tab ${res.tabId}, title: "${res.title}"`);
                } else {
                  setCdpTestResult(`CDP failed: ${res?.error ?? "unknown"}`);
                }
              });
            }}
          >
            Test CDP connection
          </button>
          {cdpTestResult && (
            <p style={{ fontSize: "10px", color: cdpTestResult.includes("works") ? T.good : T.bad, marginTop: "2px" }}>
              {cdpTestResult}
            </p>
          )}
          <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
            <input
              value={testCompany}
              onChange={(e) => setTestCompany(e.target.value)}
              placeholder="Company name..."
              style={{ flex: 1, fontSize: "10px", padding: "3px 6px", border: `1px solid ${T.lineSoft}`, borderRadius: "4px", color: T.ink, backgroundColor: T.surface }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && testCompany.trim()) {
                  setCompanyIdResult("Looking up...");
                  chrome.runtime.sendMessage(
                    { type: "CDP_GET_COMPANY_ID", payload: { companyName: testCompany } },
                    (res) => {
                      if (res?.ok) {
                        setCompanyIdResult(`${res.companyName} → ID: ${res.companyId} (${res.method})`);
                      } else {
                        setCompanyIdResult(`Failed: ${res?.error ?? "unknown"}`);
                      }
                    }
                  );
                }
              }}
            />
            <button
              style={{ fontSize: "10px", color: T.ink3, background: "none", border: `1px solid ${T.lineSoft}`, borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
              onClick={() => {
                if (!testCompany.trim()) return;
                setCompanyIdResult("Looking up...");
                chrome.runtime.sendMessage(
                  { type: "CDP_GET_COMPANY_ID", payload: { companyName: testCompany } },
                  (res) => {
                    if (res?.ok) {
                      setCompanyIdResult(`${res.companyName} → ID: ${res.companyId} (${res.method})`);
                    } else {
                      setCompanyIdResult(`Failed: ${res?.error ?? "unknown"}`);
                    }
                  }
                );
              }}
            >
              Get ID
            </button>
          </div>
          {companyIdResult && (
            <p style={{ fontSize: "10px", color: companyIdResult.includes("ID:") ? T.good : companyIdResult === "Looking up..." ? T.ink3 : T.bad, marginTop: "2px" }}>
              {companyIdResult}
            </p>
          )}
          <button
            style={{ fontSize: "10px", color: T.ink3, background: "none", border: `1px solid ${T.lineSoft}`, borderRadius: "4px", padding: "2px 6px", cursor: "pointer", marginTop: "4px", width: "100%" }}
            onClick={() => {
              if (!testCompany.trim()) return;
              setDiscoverResult("Discovering... (finding company → searching alumni)");
              chrome.runtime.sendMessage(
                { type: "CDP_DISCOVER", payload: { companyName: testCompany, schoolId: "5176" } },
                (res) => {
                  if (res?.ok) {
                    const diagList = (res.errors as string[] | undefined)?.join("\n") ?? "";
                    setDiscoverResult(
                      `${res.companyName}: ${res.count} found, ${res.saved} saved\n\n${diagList}`
                    );
                  } else {
                    setDiscoverResult(`Failed: ${res?.error ?? "unknown"}`);
                  }
                }
              );
            }}
          >
            Discover INSEAD alumni (dev)
          </button>
          {discoverResult && (
            <p style={{
              fontSize: "10px",
              color: discoverResult.includes("SAVED") ? T.good : discoverResult.startsWith("Discovering") ? T.ink3 : T.ink2,
              marginTop: "2px",
              whiteSpace: "pre-wrap",
              maxHeight: "200px",
              overflow: "auto",
            }}>
              {discoverResult}
            </p>
          )}
        </>
      )}
    </div>
  );
}
