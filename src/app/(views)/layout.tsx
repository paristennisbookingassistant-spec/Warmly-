"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import Onboarding from "@/components/onboarding/Onboarding";
import ProfileBuildingChip from "@/components/onboarding/ProfileBuildingChip";

// LEGACY localStorage key from the per-browser-domain onboarding gate.
// We've migrated to a per-user DB column (users.onboarded). Kept here so
// we can detect + clean up stale values from older sessions.
const LEGACY_ONBOARDING_KEY = "warmly.onboarded";

type NavItem = {
  href: string;
  label: string;
  kbd: string;
  icon: (active: boolean) => React.ReactElement;
  /** Optional numeric badge — only shown if count > 0 */
  badgeCount?: number;
};

// Minimal stroke icons — match the design system (1.5px stroke, 14px box).
const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/chat",
    label: "Chat",
    kbd: "G C",
    icon: () => (
      <svg {...strokeProps} className="w-3.5 h-3.5">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: "/contacts",
    label: "Contacts",
    kbd: "G N",
    icon: () => (
      <svg {...strokeProps} className="w-3.5 h-3.5">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c.8-3 3-5 6-5s5.2 2 6 5" />
        <circle cx="17" cy="7" r="2" />
        <path d="M16 13c2.5 0 4.5 1.8 5 4.5" />
      </svg>
    ),
  },
  {
    href: "/meetings",
    label: "Meetings",
    kbd: "G M",
    icon: () => (
      <svg {...strokeProps} className="w-3.5 h-3.5">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "Goals",
    kbd: "G G",
    icon: () => (
      <svg {...strokeProps} className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    kbd: "G S",
    icon: () => (
      <svg {...strokeProps} className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function ViewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  // null = not yet checked; false = not done; true = done.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  /**
   * Count of contacts awaiting Tinder-style triage. Drives:
   *   - Whether a "Review" entry appears in the sidebar at all
   *   - The badge number on that entry
   * Polled every 30s so the badge stays current as the extension
   * saves new discoveries in the background.
   */
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    // Source of truth is the DB column users.onboarded. Read via the
    // /api/users/me endpoint. Falls back to "show onboarding" on any
    // network/auth error so a logged-in user is never silently stuck
    // on a black screen.
    let cancelled = false;
    void fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((body: { data?: { onboarded?: boolean } | null }) => {
        if (cancelled) return;
        setOnboarded(body?.data?.onboarded === true);
      })
      .catch(() => {
        if (cancelled) return;
        setOnboarded(false); // fail open to onboarding rather than blank screen
      });

    // Clean up the legacy localStorage flag if present. Doesn't affect
    // the current session, just prevents confusion if anyone reads it.
    try {
      localStorage.removeItem(LEGACY_ONBOARDING_KEY);
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the pending-review count — controls whether "Review" is visible
  // in the sidebar and what number shows in its badge.
  useEffect(() => {
    if (onboarded !== true) return; // skip during onboarding / pre-auth

    let cancelled = false;
    const fetchCount = () => {
      // Skip the network call while the tab is backgrounded to avoid
      // unnecessary requests when the user isn't looking at the app.
      if (document.visibilityState !== "visible") return;
      return fetch("/api/contacts/pending-count", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((body: { data?: { pending_count?: number } } | null) => {
          if (cancelled || !body?.data) return;
          setPendingReviewCount(body.data.pending_count ?? 0);
        })
        .catch(() => {
          // network blip — silent retry next tick
        });
    };

    void fetchCount();
    const interval = window.setInterval(fetchCount, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [onboarded]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then((response: { data: { user: User | null } }) => {
      const user = response.data.user;
      if (user) {
        setUserEmail(user.email ?? null);
        setUserName(
          (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            null
        );
      }
    });
    // Forward session to Chrome extension (if installed) via postMessage.
    void supabase.auth.getSession().then((response: { data: { session: Session | null } }) => {
      const session = response.data.session;
      if (session) {
        window.postMessage(
          {
            type: "NETWORKING_COACH_AUTH",
            session: {
              user_id: session.user.id,
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
            },
          },
          window.location.origin
        );
      }
    });
  }, []);

  // Gate: while we're checking, show a quiet placeholder so we don't flash the app.
  if (onboarded === null) {
    return <div className="h-screen" style={{ background: "var(--bg)" }} />;
  }

  // Gate: first-time users see Onboarding before the app shell.
  if (onboarded === false) {
    const finish = () => {
      // The Onboarding component's submit handler now sets onboarded=true
      // on the server via /api/users/me/onboarding-complete. We optimistically
      // flip local state so the gate clears without an extra round-trip.
      setOnboarded(true);
    };
    return <Onboarding onDone={finish} onSkip={finish} />;
  }

  return (
    <div
      className="flex h-screen overflow-x-auto min-w-[768px]"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-[232px] flex-shrink-0 flex flex-col h-full"
        style={{ background: "var(--sidebar-bg)" }}
      >
        {/* Brand / wordmark */}
        <div className="px-5 pt-6 pb-5 flex items-baseline gap-1.5">
          <span
            className="font-display italic text-[26px] leading-none tracking-tight"
            style={{ color: "var(--sidebar-ink)" }}
          >
            Warmly
          </span>
          <span
            className="inline-block w-[5px] h-[5px] rounded-full -translate-y-[10px]"
            style={{ background: "var(--accent)" }}
          />
        </div>

        {/* Nav items — compose a per-render list so we can splice the
            conditional "Review" entry in only when there are pending
            profiles to triage (count > 0). Position: right after Chat,
            so it surfaces high in the visual hierarchy. */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          {(() => {
            const items = [...NAV_ITEMS];
            if (pendingReviewCount > 0) {
              const reviewItem: NavItem = {
                href: "/review",
                label: "Review",
                kbd: "G R",
                badgeCount: pendingReviewCount,
                icon: () => (
                  <svg {...strokeProps} className="w-3.5 h-3.5">
                    <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
                  </svg>
                ),
              };
              // Insert right after the Chat entry (index 0)
              items.splice(1, 0, reviewItem);
            }
            return items;
          })().map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors duration-150 group"
                )}
                style={{
                  color: isActive
                    ? "var(--sidebar-ink)"
                    : "var(--sidebar-ink-2)",
                  background: isActive ? "var(--sidebar-active)" : "transparent",
                }}
              >
                <span
                  className="flex-shrink-0"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--sidebar-ink-3)",
                  }}
                >
                  {item.icon(isActive)}
                </span>
                <span className="flex-1 flex items-center gap-2">
                  {item.label}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[18px] text-center leading-none"
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                      }}
                      aria-label={`${item.badgeCount} pending review`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </span>
                <span
                  className="font-mono text-[10px] tracking-wider"
                  style={{ color: "var(--sidebar-ink-3)" }}
                >
                  {item.kbd}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="px-3 pb-4 pt-3 border-t"
          style={{ borderColor: "var(--sidebar-line)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md group cursor-pointer">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(1 0 0 / 0.06)",
                boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.08)",
              }}
            >
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--sidebar-ink-2)" }}
              >
                {userName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[12.5px] font-medium truncate leading-tight"
                style={{ color: "var(--sidebar-ink)" }}
              >
                {userName ?? "Loading..."}
              </p>
              <p
                className="text-[10.5px] truncate leading-tight mt-0.5"
                style={{ color: "var(--sidebar-ink-3)" }}
              >
                {userEmail ?? ""}
              </p>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Replay onboarding"
              aria-label="Replay onboarding"
              style={{ color: "var(--sidebar-ink-3)" }}
              onClick={() => {
                // Reset onboarding state on the server, then flip local
                // state so the wizard re-renders. The endpoint is the
                // same one used for the "Skip for now" path, but called
                // with onboarded=false here. (See /api/dev/reset-onboarding
                // for the test-account version; this one's for the user
                // hitting the explicit "Replay" button.)
                void fetch("/api/users/me/onboarding-complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ onboarded: false }),
                }).finally(() => setOnboarded(false));
                // Also clear legacy localStorage if present
                try {
                  localStorage.removeItem(LEGACY_ONBOARDING_KEY);
                } catch {
                  // ignore
                }
              }}
            >
              <svg {...strokeProps} className="w-3.5 h-3.5">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Sign out"
              aria-label="Sign out"
              style={{ color: "var(--sidebar-ink-3)" }}
              onClick={async () => {
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              <svg {...strokeProps} className="w-3.5 h-3.5">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main
        className="flex-1 overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>

      {/* Bottom-right "Building your profile..." chip, only visible right
          after onboarding submission while the LLM finishes building
          profile_md + voice_md. Self-clears once those land. */}
      <ProfileBuildingChip />
    </div>
  );
}
