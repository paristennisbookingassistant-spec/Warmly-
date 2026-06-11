"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Payload types — match exactly what the extension emits via auth-bridge.ts
// ---------------------------------------------------------------------------

/**
 * Emitted repeatedly as the sync progresses.
 * phase 1 = finding connections (connections_imported / total_connections)
 * phase 2 = enriching profiles  (profiles_enriched   / total_connections)
 */
export interface SyncProgressPayload {
  sync_job_id: string;
  status: string;
  phase: 1 | 2;
  connections_imported: number;
  profiles_enriched: number;
  /** null until Phase 1 finishes and we know the full list size */
  total_connections: number | null;
  cap_hit: boolean;
}

/** Emitted once when both phases are done. */
export interface SyncCompletePayload {
  sync_job_id: string;
  connections_imported: number;
  profiles_enriched: number;
  total_connections: number | null;
  cap_hit: boolean;
}

/** Emitted if the extension encounters a fatal error. */
export interface SyncFailedPayload {
  sync_job_id: string | null;
  reason: string;
}

// ---------------------------------------------------------------------------
// Internal union — all inbound message shapes
// ---------------------------------------------------------------------------

type ExtensionMessage =
  | {
      source: "WARMLY_EXTENSION";
      type: "SYNC_STATUS_RESPONSE";
      payload: { installed: true; linkedinLoggedIn: boolean; currentJobId?: string };
    }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_PROGRESS"; payload: SyncProgressPayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_COMPLETE"; payload: SyncCompletePayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_FAILED"; payload: SyncFailedPayload };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StartSyncArgs {
  user_id: string;
  sync_job_id: string;
}

export interface ExtensionBridgeState {
  installed: boolean | null;
  linkedinLoggedIn: boolean | null;
  currentJobId: string | null;
  /** Posts START_NETWORK_SYNC with the required user_id + sync_job_id. */
  startSync: (args: StartSyncArgs) => void;
  recheck: () => void;
  lastProgress: SyncProgressPayload | null;
  syncComplete: SyncCompletePayload | null;
  syncFailed: SyncFailedPayload | null;
}

const DETECTION_TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExtensionBridge(): ExtensionBridgeState {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [linkedinLoggedIn, setLinkedinLoggedIn] = useState<boolean | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [lastProgress, setLastProgress] = useState<SyncProgressPayload | null>(null);
  const [syncComplete, setSyncComplete] = useState<SyncCompletePayload | null>(null);
  const [syncFailed, setSyncFailed] = useState<SyncFailedPayload | null>(null);
  const detectedRef = useRef(false);

  // ---- Detection -----------------------------------------------------------

  const fireDetection = useCallback(() => {
    detectedRef.current = false;
    window.postMessage({ source: "WARMLY_WEBAPP", type: "SYNC_STATUS_REQUEST" }, "*");
    return window.setTimeout(() => {
      if (!detectedRef.current) {
        setInstalled(false);
        setLinkedinLoggedIn(null);
      }
    }, DETECTION_TIMEOUT_MS);
  }, []);

  // ---- Inbound listener ----------------------------------------------------

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.data !== "object" || event.data?.source !== "WARMLY_EXTENSION") return;
      const msg = event.data as ExtensionMessage;
      switch (msg.type) {
        case "SYNC_STATUS_RESPONSE":
          detectedRef.current = true;
          setInstalled(true);
          setLinkedinLoggedIn(msg.payload.linkedinLoggedIn);
          if (msg.payload.currentJobId) setCurrentJobId(msg.payload.currentJobId);
          break;
        case "SYNC_PROGRESS":
          setLastProgress(msg.payload);
          setCurrentJobId(msg.payload.sync_job_id);
          break;
        case "SYNC_COMPLETE":
          setSyncComplete(msg.payload);
          setCurrentJobId(msg.payload.sync_job_id);
          break;
        case "SYNC_FAILED":
          setSyncFailed(msg.payload);
          break;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ---- Initial detection on mount ------------------------------------------

  useEffect(() => {
    const timer = fireDetection();
    return () => window.clearTimeout(timer);
  }, [fireDetection]);

  // ---- Outbound actions ----------------------------------------------------

  /**
   * Posts START_NETWORK_SYNC with the required payload.
   * The auth-bridge requires payload.user_id; the service worker also needs
   * payload.sync_job_id to resume correctly.
   */
  const startSync = useCallback((args: StartSyncArgs) => {
    window.postMessage(
      { source: "WARMLY_WEBAPP", type: "START_NETWORK_SYNC", payload: args },
      "*"
    );
  }, []);

  const recheck = useCallback(() => {
    setInstalled(null);
    setLinkedinLoggedIn(null);
    fireDetection();
  }, [fireDetection]);

  return {
    installed,
    linkedinLoggedIn,
    currentJobId,
    startSync,
    recheck,
    lastProgress,
    syncComplete,
    syncFailed,
  };
}
