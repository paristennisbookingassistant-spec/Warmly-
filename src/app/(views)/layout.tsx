"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const NAV_ITEMS = [
  {
    href: "/chat",
    label: "Chat",
    iconPath:
      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    href: "/contacts",
    label: "Contacts",
    iconPath:
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    href: "/goals",
    label: "Goals",
    iconPath:
      "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9",
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
    // The auth-bridge content script running on this page stores it in chrome.storage.local.
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

  return (
    <div className="flex h-screen overflow-x-auto bg-[#111111] min-w-[768px]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-[#111111]">
        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center flex-shrink-0">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">
            Networking Coach
          </span>
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-[#a3a3a3] hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <svg
                  className="flex-shrink-0"
                  style={{ width: "16px", height: "16px" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={isActive ? 2.5 : 2}
                    d={item.iconPath}
                  />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 pb-4 pt-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-all duration-150 group cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-white/60">
                {userName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white/70 truncate leading-tight">
                {userName ?? "Loading..."}
              </p>
              <p className="text-[10px] text-[#525252] truncate leading-tight mt-0.5">
                {userEmail ?? ""}
              </p>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#525252] hover:text-[#a3a3a3]"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden bg-[#fafafa]">{children}</main>
    </div>
  );
}
