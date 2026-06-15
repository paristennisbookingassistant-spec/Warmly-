"use client";

/**
 * components/v2/discover/useCompanyDiscovery.ts
 *
 * State machine for Module 3 + 4: company discovery trigger and result streaming.
 *
 * Responsibilities:
 *   - Extension presence detection (SYNC_STATUS_REQUEST / SYNC_STATUS_RESPONSE mirror)
 *   - POST /api/discovery → get discovery_session_id
 *   - postMessage WEBAPP_DISCOVER to extension
 *   - Listen for DISCOVERY_* bridge events for the progress indicator
 *   - Poll GET /api/contacts?discovery_session_id=<id>&lite=true every 3s for results
 *   - Stop polling on DISCOVERY_DONE / DISCOVERY_ERROR
 *   - Clean up listeners + intervals on unmount
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { tierLabelFromNumber } from "../palette";
import type { DeckCard } from "./types";
import type { Contact, LinkedInExperienceEntry, LinkedInEducationEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Extension bridge event shapes (inbound, source === "WARMLY_EXTENSION")
// ---------------------------------------------------------------------------

interface DiscoveryStartedPayload {
  discovery_session_id: string;
  companyName: string;
}

interface DiscoveryProgressPayload {
  discovery_session_id: string;
  profiles_saved: number;
  profiles_total: number;
  state: "RESOLVING_COMPANY" | "SEARCHING_PROFILES" | "VISITING_PROFILE" | "WAITING" | "RANKING";
}

interface DiscoveryDonePayload {
  discovery_session_id: string;
  companyName: string;
  profiles_saved: number;
  profiles_total: number;
}

interface DiscoveryErrorPayload {
  discovery_session_id: string | null;
  companyName: string;
  reason: string;
  needsPicker?: boolean;
  candidates?: CompanyCandidate[];
}

type ExtDiscoveryMessage =
  | { source: "WARMLY_EXTENSION"; type: "DISCOVERY_STARTED"; payload: DiscoveryStartedPayload }
  | { source: "WARMLY_EXTENSION"; type: "DISCOVERY_PROGRESS"; payload: DiscoveryProgressPayload }
  | { source: "WARMLY_EXTENSION"; type: "DISCOVERY_DONE"; payload: DiscoveryDonePayload }
  | { source: "WARMLY_EXTENSION"; type: "DISCOVERY_ERROR"; payload: DiscoveryErrorPayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_STATUS_RESPONSE"; payload: { installed: true } };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CompanyCandidate {
  companyName: string;
  companySlug?: string;
  companyId?: string;
}

export type DiscoveryPhase =
  | "idle"
  | "detecting"        // waiting for extension presence ping
  | "creating_session" // POST /api/discovery in flight
  | "running"          // extension is scraping
  | "done"
  | "error"
  | "no_extension";    // honest connect state

export interface DiscoveryProgress {
  profiles_saved: number;
  profiles_total: number;
  state: DiscoveryProgressPayload["state"];
}

export interface DiscoveryState {
  phase: DiscoveryPhase;
  companyName: string;
  sessionId: string | null;
  progress: DiscoveryProgress | null;
  /** Discovered contacts for the deck, appended as poll returns new items */
  discoveredCards: DeckCard[];
  errorMessage: string | null;
  /** Company picker candidates — set when extension returns needsPicker=true */
  candidates: CompanyCandidate[] | null;
  /** Extension installed status (null = unknown, false = absent, true = present) */
  extensionInstalled: boolean | null;
}

export interface UseCompanyDiscoveryReturn extends DiscoveryState {
  /** Start a company discovery. Runs presence check, creates session, dispatches. */
  startDiscovery: (params: StartDiscoveryParams) => Promise<void>;
  /** Re-dispatch with a resolved candidate from the company picker. */
  retryWithCandidate: (candidate: CompanyCandidate) => void;
  /** Reset to idle (e.g. user dismisses the card). */
  reset: () => void;
}

export interface StartDiscoveryParams {
  companyName: string;
  hint?: string;
  locationLabel?: string;
  functionLabel?: string;
}

// ---------------------------------------------------------------------------
// Contact → DeckCard mapper (reuse logic from DiscoverScreen)
// ---------------------------------------------------------------------------

function expBullet(exp: LinkedInExperienceEntry): string {
  const title = exp.title ?? "";
  const company = exp.company ?? "";
  if (title && company) return `${title} @ ${company}`;
  return title || company;
}

function eduBullet(edu: LinkedInEducationEntry): string {
  const parts: string[] = [edu.school];
  if (edu.degree) parts.push(edu.degree);
  return parts.join(" · ");
}

function inseadShortFromEdu(entries: LinkedInEducationEntry[]): string | null {
  const entry = entries.find((e) => /insead/i.test(e.school));
  if (!entry) return null;
  if (entry.degree) {
    const m = entry.degree.match(/(\d{2}[DJ])/i);
    if (m) return m[1].toUpperCase();
  }
  return "INSEAD";
}

function contactToDeckCard(c: Contact): DeckCard {
  const expBullets = (c.experience ?? []).slice(0, 2).map(expBullet);
  const latestEdu = (c.education_v2 ?? [])[0];
  const eduBullets = latestEdu ? [eduBullet(latestEdu)] : [];
  const about = [...expBullets, ...eduBullets].slice(0, 3);
  const inseadShort = c.education_v2 ? inseadShortFromEdu(c.education_v2) : null;

  return {
    id: c.id,
    name: c.name,
    role: c.current_title ?? null,
    company: c.company ?? null,
    location: c.location ?? null,
    avatar: c.photo_url ?? c.avatar_url ?? null,
    linkedinUrl: c.linkedin_url ?? null,
    tier: c.tier != null ? tierLabelFromNumber(c.tier) : null,
    rationale: c.recommendation_reason ?? c.linkedin_bio ?? null,
    about,
    inseadShort,
    channel: "linkedin",
  };
}

// ---------------------------------------------------------------------------
// Contact API response shape
// ---------------------------------------------------------------------------

interface ContactsApiResponse {
  data: {
    items: Contact[];
    total: number;
    has_more: boolean;
  };
}

// ---------------------------------------------------------------------------
// StartDiscoveryResponse shape (mirrors api.ts StartDiscoveryResponse)
// ---------------------------------------------------------------------------

interface StartDiscoveryApiResponse {
  data: { id: string } | null;
  error: { message: string } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESENCE_TIMEOUT_MS = 2000;
const POLL_INTERVAL_MS = 3000;
const SCHOOL_ID = "5176";
const SCHOOL_LABEL = "INSEAD";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const IDLE_STATE: DiscoveryState = {
  phase: "idle",
  companyName: "",
  sessionId: null,
  progress: null,
  discoveredCards: [],
  errorMessage: null,
  candidates: null,
  extensionInstalled: null,
};

export function useCompanyDiscovery(): UseCompanyDiscoveryReturn {
  const [state, setState] = useState<DiscoveryState>(IDLE_STATE);

  // Refs for cleanup
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const activeSessionRef = useRef<string | null>(null);
  // Pending dispatch params when waiting for extension presence
  const pendingDispatchRef = useRef<{
    companyName: string;
    hint?: string;
    locationLabel?: string;
    functionLabel?: string;
    sessionId: string;
    userId: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Poll
  // ---------------------------------------------------------------------------

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchContacts = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/contacts?discovery_session_id=${sessionId}&lite=true`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const json = (await res.json()) as ContactsApiResponse;
      const items = json.data?.items ?? [];
      const newCards: DeckCard[] = [];
      for (const item of items) {
        if (!seenIdsRef.current.has(item.id)) {
          seenIdsRef.current.add(item.id);
          newCards.push(contactToDeckCard(item));
        }
      }
      if (newCards.length > 0) {
        setState((prev) => ({
          ...prev,
          discoveredCards: [...prev.discoveredCards, ...newCards],
        }));
      }
    } catch {
      // Network error during poll — silent, will retry on next interval
    }
  }, []);

  const startPoll = useCallback(
    (sessionId: string) => {
      stopPoll();
      seenIdsRef.current = new Set();
      // Immediate first fetch
      void fetchContacts(sessionId);
      pollTimerRef.current = setInterval(() => {
        void fetchContacts(sessionId);
      }, POLL_INTERVAL_MS);
    },
    [stopPoll, fetchContacts]
  );

  // ---------------------------------------------------------------------------
  // Bridge listener (set once, stable)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.data !== "object" || event.data?.source !== "WARMLY_EXTENSION") return;
      const msg = event.data as ExtDiscoveryMessage;

      switch (msg.type) {
        case "SYNC_STATUS_RESPONSE": {
          // Extension presence confirmed — clear timeout and fire pending dispatch
          if (presenceTimerRef.current) {
            clearTimeout(presenceTimerRef.current);
            presenceTimerRef.current = null;
          }
          setState((prev) => ({ ...prev, extensionInstalled: true }));
          const pending = pendingDispatchRef.current;
          if (pending) {
            pendingDispatchRef.current = null;
            dispatchToExtension(pending);
          }
          break;
        }

        case "DISCOVERY_STARTED": {
          const { discovery_session_id } = msg.payload;
          if (discovery_session_id !== activeSessionRef.current) break;
          setState((prev) => ({
            ...prev,
            phase: "running",
            progress: { profiles_saved: 0, profiles_total: 0, state: "RESOLVING_COMPANY" },
          }));
          startPoll(discovery_session_id);
          break;
        }

        case "DISCOVERY_PROGRESS": {
          const p = msg.payload;
          if (p.discovery_session_id !== activeSessionRef.current) break;
          setState((prev) => ({
            ...prev,
            phase: "running",
            progress: {
              profiles_saved: p.profiles_saved,
              profiles_total: p.profiles_total,
              state: p.state,
            },
          }));
          break;
        }

        case "DISCOVERY_DONE": {
          const { discovery_session_id } = msg.payload;
          if (discovery_session_id !== activeSessionRef.current) break;
          stopPoll();
          // Final fetch to catch any late-arriving contacts
          void fetchContacts(discovery_session_id);
          setState((prev) => ({
            ...prev,
            phase: "done",
            progress: {
              profiles_saved: msg.payload.profiles_saved,
              profiles_total: msg.payload.profiles_total,
              state: "RANKING",
            },
          }));
          break;
        }

        case "DISCOVERY_ERROR": {
          const ep = msg.payload;
          if (ep.discovery_session_id && ep.discovery_session_id !== activeSessionRef.current) break;
          stopPoll();
          if (ep.reason === "extension_unavailable") {
            setState((prev) => ({
              ...prev,
              phase: "no_extension",
              extensionInstalled: false,
              errorMessage: "Connect the Warmly extension to run live discovery.",
            }));
          } else if (ep.needsPicker && ep.candidates && ep.candidates.length > 0) {
            setState((prev) => ({
              ...prev,
              phase: "error",
              errorMessage: "Multiple companies matched. Pick the right one below.",
              candidates: ep.candidates ?? null,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              phase: "error",
              errorMessage: ep.reason ?? "Discovery failed. Please try again.",
            }));
          }
          break;
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [startPoll, stopPoll, fetchContacts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPoll();
      if (presenceTimerRef.current) clearTimeout(presenceTimerRef.current);
    };
  }, [stopPoll]);

  // ---------------------------------------------------------------------------
  // Dispatch helper
  // ---------------------------------------------------------------------------

  function dispatchToExtension(params: {
    companyName: string;
    hint?: string;
    locationLabel?: string;
    functionLabel?: string;
    sessionId: string;
    userId: string;
  }) {
    window.postMessage(
      {
        type: "WEBAPP_DISCOVER",
        payload: {
          companyName: params.companyName,
          user_id: params.userId,
          hint: params.hint,
          schoolId: SCHOOL_ID,
          schoolLabel: SCHOOL_LABEL,
          locationLabel: params.locationLabel,
          functionLabel: params.functionLabel,
          locationGeoUrn: undefined,
          functionKeywords: params.functionLabel,
          discovery_session_id: params.sessionId,
        },
      },
      window.location.origin
    );
  }

  // ---------------------------------------------------------------------------
  // startDiscovery
  // ---------------------------------------------------------------------------

  const startDiscovery = useCallback(
    async (params: StartDiscoveryParams) => {
      const { companyName, hint, locationLabel, functionLabel } = params;

      // 1. Get current user id
      let userId: string;
      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");
        const json = (await res.json()) as { data?: { id?: string } };
        const id = json.data?.id;
        if (!id) throw new Error("User ID not found");
        userId = id;
      } catch {
        setState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: "Could not load your user profile. Please refresh and try again.",
        }));
        return;
      }

      // 2. Create discovery session
      setState((prev) => ({
        ...prev,
        phase: "creating_session",
        companyName,
        sessionId: null,
        progress: null,
        discoveredCards: [],
        errorMessage: null,
        candidates: null,
      }));

      let sessionId: string;
      try {
        const res = await fetch("/api/discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            target_companies: [companyName],
            company_hint: hint,
            school_label: SCHOOL_LABEL,
            location_label: locationLabel,
            function_label: functionLabel,
            max_profiles: 25,
          }),
        });
        if (res.status === 429) {
          const json = (await res.json()) as { error?: { message?: string } };
          setState((prev) => ({
            ...prev,
            phase: "error",
            errorMessage:
              json.error?.message ?? "You've hit today's discovery limit — try again later.",
          }));
          return;
        }
        if (!res.ok) {
          const json = (await res.json()) as { error?: { message?: string } };
          throw new Error(json.error?.message ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as StartDiscoveryApiResponse;
        if (!json.data?.id) throw new Error("Invalid session response");
        sessionId = json.data.id;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage:
            err instanceof Error ? err.message : "Failed to create discovery session.",
        }));
        return;
      }

      activeSessionRef.current = sessionId;
      seenIdsRef.current = new Set();
      setState((prev) => ({
        ...prev,
        sessionId,
        phase: "detecting",
      }));

      // 3. Detect extension presence
      const dispatchArgs = { companyName, hint, locationLabel, functionLabel, sessionId, userId };
      pendingDispatchRef.current = dispatchArgs;

      // Fire presence ping (same mechanism as useExtensionBridge)
      window.postMessage({ source: "WARMLY_WEBAPP", type: "SYNC_STATUS_REQUEST" }, "*");

      // If no SYNC_STATUS_RESPONSE in 2s → extension absent
      presenceTimerRef.current = setTimeout(() => {
        presenceTimerRef.current = null;
        pendingDispatchRef.current = null;
        setState((prev) => {
          // Only move to no_extension if we're still in detecting phase
          if (prev.phase !== "detecting") return prev;
          return {
            ...prev,
            phase: "no_extension",
            extensionInstalled: false,
            errorMessage:
              "Connect the Warmly extension to run live discovery.",
          };
        });
      }, PRESENCE_TIMEOUT_MS);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // retryWithCandidate
  // ---------------------------------------------------------------------------

  const retryWithCandidate = useCallback(
    (candidate: CompanyCandidate) => {
      if (!activeSessionRef.current) return;
      const sessionId = activeSessionRef.current;

      // Need userId — re-fetch from /api/users/me
      void (async () => {
        let userId: string;
        try {
          const res = await fetch("/api/users/me", { credentials: "include" });
          const json = (await res.json()) as { data?: { id?: string } };
          const id = json.data?.id;
          if (!id) throw new Error("No user id");
          userId = id;
        } catch {
          setState((prev) => ({
            ...prev,
            phase: "error",
            errorMessage: "Could not reload your profile. Please try again.",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          phase: "running",
          candidates: null,
          errorMessage: null,
          progress: { profiles_saved: 0, profiles_total: 0, state: "RESOLVING_COMPANY" },
        }));

        window.postMessage(
          {
            type: "WEBAPP_DISCOVER",
            payload: {
              companyName: candidate.companyName,
              user_id: userId,
              companySlug: candidate.companySlug,
              companyId: candidate.companyId,
              schoolId: SCHOOL_ID,
              schoolLabel: SCHOOL_LABEL,
              discovery_session_id: sessionId,
            },
          },
          window.location.origin
        );

        startPoll(sessionId);
      })();
    },
    [startPoll]
  );

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    stopPoll();
    if (presenceTimerRef.current) {
      clearTimeout(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }
    pendingDispatchRef.current = null;
    activeSessionRef.current = null;
    seenIdsRef.current = new Set();
    setState(IDLE_STATE);
  }, [stopPoll]);

  return {
    ...state,
    startDiscovery,
    retryWithCandidate,
    reset,
  };
}
