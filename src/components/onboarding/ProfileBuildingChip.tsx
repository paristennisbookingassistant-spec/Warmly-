"use client";

/**
 * ProfileBuildingChip — small bottom-right notice shown while the LLM is
 * finishing the post-onboarding build of profile_md + voice_md.
 *
 * Why this exists: the onboarding wizard's "Continue" handler POSTs to
 * /api/users/me/onboarding-complete fire-and-forget, then calls onDone()
 * after a 1.2s timeout. The actual server build (two MiniMax calls) takes
 * 3-8 seconds. During that gap, the user lands on the main app shell but
 * /api/users/me still returns null profile_md / voice_md. Without this
 * chip, the user sees an "empty coach" momentarily, which feels broken.
 *
 * Behavior:
 *   1. Onboarding sets sessionStorage["warmly.profile-building"] = "1"
 *      on submit
 *   2. This chip checks the flag on mount; if set, renders a small pill
 *      with shimmer animation in the bottom-right
 *   3. Polls GET /api/users/me every 1.5s
 *   4. When profile_md is non-empty (or 30s elapses), clears the flag and
 *      hides the chip
 *
 * sessionStorage instead of localStorage so a stale flag can't outlive
 * the tab. Also gated by a max poll count so we don't poll forever if
 * the build actually failed server-side.
 */

import { useEffect, useState } from "react";

const FLAG_KEY = "warmly.profile-building";
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 25; // ~37s — generous, covers slow LLM days

interface UserMeResponse {
  data?: {
    profile_md?: string | null;
    voice_md?: string | null;
  };
}

export default function ProfileBuildingChip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Read flag synchronously on mount
    let isBuilding = false;
    try {
      isBuilding = sessionStorage.getItem(FLAG_KEY) === "1";
    } catch {
      // sessionStorage unavailable — skip the chip
    }
    if (!isBuilding) return;

    setVisible(true);
    let polls = 0;
    let cancelled = false;

    const clearFlag = () => {
      try {
        sessionStorage.removeItem(FLAG_KEY);
      } catch {
        // ignore
      }
      if (!cancelled) setVisible(false);
    };

    const poll = async () => {
      if (cancelled) return;
      polls++;
      try {
        const r = await fetch("/api/users/me", { credentials: "include" });
        if (r.ok) {
          const body: UserMeResponse = await r.json();
          if (body.data?.profile_md && body.data.profile_md.trim().length > 0) {
            clearFlag();
            return;
          }
        }
      } catch {
        // network blip — try again next tick
      }
      if (polls >= MAX_POLLS) {
        // Give up — clear the flag so we don't keep the chip up forever
        // if the server-side build actually failed.
        clearFlag();
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    let timer: ReturnType<typeof setTimeout> = setTimeout(
      poll,
      POLL_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-md"
      style={{
        background: "color-mix(in oklch, var(--bg) 95%, var(--accent))",
        border: "1px solid var(--line-strong)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="relative inline-flex w-3 h-3">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="relative inline-flex rounded-full h-3 w-3"
          style={{ background: "var(--accent)" }}
        />
      </span>
      <span
        className="text-[12.5px] font-medium"
        style={{ color: "var(--ink)" }}
      >
        Building your profile{" "}
        <span
          className="font-display italic"
          style={{ color: "var(--accent)" }}
        >
          and voice
        </span>
        ...
      </span>
    </div>
  );
}
