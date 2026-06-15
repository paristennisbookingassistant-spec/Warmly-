"use client";

/**
 * app/v2/OnboardingGate.tsx
 * Client component that checks /api/users/me after the shell renders.
 * If onboarded === false and we are NOT already on /v2/onboarding, it redirects.
 * Runs without blocking the initial paint (no loading flash for onboarded users).
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface UserMeData {
  onboarded?: boolean;
}

interface UserMeResponse {
  data?: UserMeData;
  error?: unknown;
}

// Module-level: once we've confirmed the user is onboarded this session, never
// re-check on subsequent navigations. Previously this fetched /api/users/me on
// EVERY screen switch (effect keyed on pathname), adding a redundant round-trip
// to each navigation. Resets only on a full page reload.
let confirmedOnboarded = false;

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Never redirect when already on the onboarding page
    if (pathname === "/v2/onboarding") return;
    // Already verified onboarded this session — skip the network call.
    if (confirmedOnboarded) return;

    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json() as Promise<UserMeResponse>)
      .then((body) => {
        if (body.data && body.data.onboarded === false) {
          router.replace("/v2/onboarding");
        } else if (body.data) {
          confirmedOnboarded = true;
        }
      })
      .catch(() => {
        // Network error — don't redirect; let the user stay on the page
      });
  }, [pathname, router]);

  return null;
}
