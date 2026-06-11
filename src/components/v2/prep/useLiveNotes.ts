"use client";

/**
 * components/v2/prep/useLiveNotes.ts
 * localStorage-backed per-artifact notes dict, debounced 400ms.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveNotes } from "./types";

export function useLiveNotes(
  artifactId: string | null
): [LiveNotes, (key: string, val: string) => void] {
  const storageKey = `warmly:prep-notes:${artifactId ?? "unknown"}`;

  const [notes, setNotes] = useState<LiveNotes>(() => {
    if (!artifactId || typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as LiveNotes) : {};
    } catch {
      return {};
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!artifactId) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(notes));
      } catch {
        // storage quota exceeded — ignore silently
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [notes, artifactId, storageKey]);

  const setNote = useCallback((key: string, val: string) => {
    setNotes((prev) => ({ ...prev, [key]: val }));
  }, []);

  return [notes, setNote];
}
