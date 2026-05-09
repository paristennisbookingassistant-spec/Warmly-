"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import Onboarding from "@/components/onboarding/Onboarding";

const ONBOARDING_KEY = "warmly.onboarded";

type NavItem = {
  href: string;
  label: string;
  kbd: string;
  icon: (active: boolean) => React.ReactElement;
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

  useEffect(() => {
    try {
      setOnboarded(localStorage.getItem(ONBOARDING_KEY) === "1");
    } catch {
      setOnboarded(true); // fail open if localStorage isn't available
    }
  }, []);

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
      try {
        localStorage.setItem(ONBOARDING_KEY, "1");
      } catch {
        // ignore
      }
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

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto sidebar-scroll">
          {NAV_ITEMS.map((item) => {
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
                <span className="flex-1">{item.label}</span>
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
                try {
                  localStorage.removeItem(ONBOARDING_KEY);
                } catch {
                  // ignore
                }
                setOnboarded(false);
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
    </div>
  );
}
