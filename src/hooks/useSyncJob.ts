"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncJob } from "@/types/database";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface SyncJobState {
  job: SyncJob | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;

/** Terminal statuses — stop polling once we reach one of these. */
const TERMINAL_STATUSES: SyncJob["status"][] = ["completed", "failed"];

export function useSyncJob(jobId: string | null): SyncJobState {
  const [job, setJob] = useState<SyncJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchJob = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/sync-jobs/${id}`, { credentials: "include" });
      if (!mountedRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setError(body?.error?.message ?? `Request failed (${res.status})`);
        return;
      }

      const body = await res.json() as { data?: SyncJob; error?: { message?: string } };
      if (!mountedRef.current) return;

      if (body.data) {
        setJob(body.data);
        setError(null);

        // Stop polling when terminal status reached
        if (TERMINAL_STATUSES.includes(body.data.status)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else if (body.error) {
        setError(body.error.message ?? "Failed to load sync job");
      }
    } catch {
      if (mountedRef.current) {
        setError("Network error — retrying...");
      }
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    void fetchJob(id);

    intervalRef.current = setInterval(() => {
      void fetchJob(id);
    }, POLL_INTERVAL_MS);
  }, [fetchJob]);

  useEffect(() => {
    mountedRef.current = true;

    if (!jobId) {
      setJob(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchJob(jobId).finally(() => {
      if (mountedRef.current) setLoading(false);
    });

    startPolling(jobId);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, fetchJob, startPolling]);

  const refetch = useCallback(() => {
    if (!jobId) return;
    void fetchJob(jobId);
  }, [jobId, fetchJob]);

  return { job, loading, error, refetch };
}
