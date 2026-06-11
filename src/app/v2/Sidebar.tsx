"use client";

/**
 * app/v2/Sidebar.tsx
 * V2 dark sidebar shell: Home / Discover / Contacts / Settings.
 * Ported from design/warmly-v2/project/js/shared.jsx (Sidebar) but wired to
 * the real Supabase session for the user card + sign out, and forwarding the
 * session to the Chrome extension (same as V1's (views) layout).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Icon, type IconProps } from "@/components/v2/icons";
import { Wordmark } from "@/components/v2/primitives";

type NavItem = { href: string; label: string; icon: (p: IconProps) => React.ReactNode };

const NAV_ITEMS: NavItem[] = [
  { href: "/v2", label: "Home", icon: Icon.Home },
  { href: "/v2/discover", label: "Discover", icon: Icon.Compass },
  { href: "/v2/contacts", label: "Contacts", icon: Icon.Users },
  { href: "/v2/settings", label: "Settings", icon: Icon.Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/v2") return pathname === "/v2";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      setName(
        (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split("@")[0] ??
          null
      );
    });
    // Forward the session to the Chrome extension (if installed), same as V1.
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      if (!session) return;
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
    });
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className="w-[232px] flex-shrink-0 flex flex-col h-full"
      style={{ background: "var(--sidebar-bg)" }}
    >
      <div className="px-6 pt-7 pb-8">
        <Wordmark size={26} />
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const IconCmp = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-colors duration-150"
              style={{
                color: active ? "#f3e2cd" : "var(--sidebar-ink-2)",
                background: active ? "rgba(184,122,74,0.16)" : "transparent",
              }}
            >
              <span style={{ color: active ? "var(--accent)" : "var(--sidebar-ink-3)" }}>
                <IconCmp size={17} />
              </span>
              <span>{item.label}</span>
              {active && (
                <span
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-5 mt-auto">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: "rgba(244,237,224,0.04)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--sidebar-line)" }}
          >
            <span className="text-[12px] font-medium" style={{ color: "var(--sidebar-ink)" }}>
              {name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] leading-tight truncate" style={{ color: "var(--sidebar-ink)" }}>
              {name ?? "Loading..."}
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--sidebar-ink-3)" }}>
              {email ?? ""}
            </div>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={signOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--sidebar-ink-3)" }}
          >
            <Icon.LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
