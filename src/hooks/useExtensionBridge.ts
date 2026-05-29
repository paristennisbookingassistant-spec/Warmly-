"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SyncProgressPayload {
  jobId: string;
  phase: "list" | "batch" | "done";
  processedContacts: number;
  totalContacts: number;
  lastCompletedPage: number;
}

export interface SyncCompletePayload {
  jobId: string;
  total: number;
  capHit: boolean;
}

export interface SyncFailedPayload {
  jobId: string;
  error: string;
}

export interface SyncPausedPayload {
  jobId: string;
  reason: "rate_limit" | "user_aborted";
  resumeAt?: string;
}

type ExtensionMessage =
  | { source: "WARMLY_EXTENSION"; type: "SYNC_STATUS_RESPONSE"; payload: { installed: true; linkedinLoggedIn: boolean; currentJobId?: string } }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_PROGRESS"; payload: SyncProgressPayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_COMPLETE"; payload: SyncCompletePayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_FAILED"; payload: SyncFailedPayload }
  | { source: "WARMLY_EXTENSION"; type: "SYNC_PAUSED"; payload: SyncPausedPayload };

export interface ExtensionBridgeState {
  installed: boolean | null;
  linkedinLoggedIn: boolean | null;
  currentJobId: string | null;
  startSync: () => void;
  recheck: () => void;
  lastProgress: SyncProgressPayload | null;
  syncComplete: SyncCompletePayload | null;
  syncFailed: SyncFailedPayload | null;
  syncPaused: SyncPausedPayload | null;
}

const DETECTION_TIMEOUT_MS = 2000;

export function useExtensionBridge(): ExtensionBridgeState {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [linkedinLoggedIn, setLinkedinLoggedIn] = useState<boolean | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [lastProgress, setLastProgress] = useState<SyncProgressPayload | null>(null);
  const [syncComplete, setSyncComplete] = useState<SyncCompletePayload | null>(null);
  const [syncFailed, setSyncFailed] = useState<SyncFailedPayload | null>(null);
  const [syncPaused, setSyncPaused] = useState<SyncPausedPayload | null>(null);
  const detectedRef = useRef(false);

  const sendToExtension = useCallback((type: string) => {
    window.postMessage({ source: "WARMLY_WEBAPP", type }, "*");
  }, []);

  const fireDetection = useCallback(() => {
    detectedRef.current = false;
    sendToExtension("SYNC_STATUS_REQUEST");
    return window.setTimeout(() => {
      if (!detectedRef.current) {
        setInstalled(false);
        setLinkedinLoggedIn(null);
      }
    }, DETECTION_TIMEOUT_MS);
  }, [sendToExtension]);

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
          setCurrentJobId(msg.payload.jobId);
          break;
        case "SYNC_COMPLETE":
          setSyncComplete(msg.payload);
          setCurrentJobId(msg.payload.jobId);
          break;
        case "SYNC_FAILED":
          setSyncFailed(msg.payload);
          break;
        case "SYNC_PAUSED":
          setSyncPaused(msg.payload);
          break;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const timer = fireDetection();
    return () => window.clearTimeout(timer);
  }, [fireDetection]);

  const startSync = useCallback(() => sendToExtension("START_NETWORK_SYNC"), [sendToExtension]);

  const recheck = useCallback(() => {
    setInstalled(null);
    setLinkedinLoggedIn(null);
    fireDetection();
  }, [fireDetection]);

  return { installed, linkedinLoggedIn, currentJobId, startSync, recheck, lastProgress, syncComplete, syncFailed, syncPaused };
}
