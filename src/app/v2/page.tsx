"use client";

/**
 * app/v2/page.tsx — V2 Home (Phase 5b, with Module 7 reconnect reminder).
 * Fetches:
 *   GET /api/users/me                → user name
 *   GET /api/contacts/pending-count  → pending discovery count
 *   GET /api/contacts?user_action=saved&sort_by=relevance_score&sort_order=desc&per_page=6&lite=true
 *   GET /api/contacts?user_action=saved&per_page=50&lite=true → for reconnect reminder
 */

import { useEffect, useState } from "react";
import type { Contact } from "@/types/database";
import { GreetingHero } from "@/components/v2/home/GreetingHero";
import { PickupCard } from "@/components/v2/home/PickupCard";
import { DiscoverCard } from "@/components/v2/home/DiscoverCard";
import { RecentContactsStrip } from "@/components/v2/home/RecentContactsStrip";
import { FirstRunState } from "@/components/v2/home/FirstRunState";
import {
  GreetingSkeleton,
  ActionCardSkeleton,
  StripSkeleton,
} from "@/components/v2/home/HomeSkeletons";
import { ReconnectReminder, ReconnectReminderSkeleton } from "@/components/v2/home/ReconnectReminder";
import { isReconnectDue } from "@/lib/crm/cadence";

interface HomeState {
  userName: string | null;
  pendingCount: number;
  savedContacts: Contact[];
  reconnectContacts: Contact[];
  loading: boolean;
  reconnectLoading: boolean;
  error: string | null;
}

function useHomeData(): HomeState {
  const [state, setState] = useState<HomeState>({
    userName: null,
    pendingCount: 0,
    savedContacts: [],
    reconnectContacts: [],
    loading: true,
    reconnectLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, reconnectLoading: true, error: null }));

    // Primary fetch: user, pending count, recent contacts (6)
    Promise.all([
      fetch("/api/users/me", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/contacts/pending-count", { credentials: "include" }).then((r) => r.json()),
      fetch(
        "/api/contacts?user_action=saved&sort_by=relevance_score&sort_order=desc&per_page=6&lite=true",
        { credentials: "include" }
      ).then((r) => r.json()),
    ])
      .then(([me, count, contacts]) => {
        if (cancelled) return;
        if (me.error) {
          setState((s) => ({ ...s, loading: false, error: me.error.message ?? "Could not load profile." }));
          return;
        }
        setState((s) => ({
          ...s,
          userName: (me.data?.name as string | null | undefined) ?? null,
          pendingCount: (count.data?.pending_count as number | undefined) ?? 0,
          savedContacts: (contacts.data?.items as Contact[] | undefined) ?? [],
          loading: false,
          error: null,
        }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Network error. Try reloading." }));
      });

    // Reconnect fetch: broader set to compute due contacts client-side
    fetch(
      "/api/contacts?user_action=saved&per_page=50&lite=true",
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const all: Contact[] = (json.data?.items as Contact[] | undefined) ?? [];
        const due = all
          .filter((c) => isReconnectDue(c.next_touch_at))
          .sort((a, b) => {
            const aTime = a.next_touch_at ? new Date(a.next_touch_at).getTime() : 0;
            const bTime = b.next_touch_at ? new Date(b.next_touch_at).getTime() : 0;
            return aTime - bTime;
          });
        setState((s) => ({ ...s, reconnectContacts: due, reconnectLoading: false }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, reconnectLoading: false }));
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}

export default function V2HomePage() {
  const { userName, pendingCount, savedContacts, reconnectContacts, loading, reconnectLoading, error } = useHomeData();
  const firstName = userName?.split(" ")[0] ?? "there";
  const hasSaved = savedContacts.length > 0;
  const firstRun = !loading && !hasSaved;

  if (error) {
    return (
      <div className="fade-up px-12 pt-12 pb-12 flex flex-col items-center">
        <div className="rounded-2xl px-6 py-5 max-w-[480px] text-center" style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}>
          <p className="text-[13.5px] text-ink-2">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-[12.5px] underline text-ink-3 hover:text-ink transition-colors">
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-12 pt-12 pb-12 flex flex-col items-center fade-up">
      {loading ? <GreetingSkeleton /> : <GreetingHero firstName={firstName} firstRun={firstRun} />}

      {loading ? (
        <div className="w-full max-w-[960px] grid grid-cols-2 gap-6">
          <ActionCardSkeleton />
          <ActionCardSkeleton />
        </div>
      ) : firstRun ? (
        <div className="w-full max-w-[480px]">
          <DiscoverCard firstRun pendingCount={0} />
        </div>
      ) : (
        <div className="w-full max-w-[960px] grid grid-cols-2 gap-6">
          <PickupCard contacts={savedContacts} resumeContact={savedContacts[0]} />
          <DiscoverCard firstRun={false} pendingCount={pendingCount} />
        </div>
      )}

      {/* Module 7: Reconnect reminder — below action cards, above recent strip */}
      {!loading && !firstRun && (
        <div className="w-full max-w-[960px] mt-6">
          {reconnectLoading ? (
            <ReconnectReminderSkeleton />
          ) : (
            <ReconnectReminder contacts={reconnectContacts} />
          )}
        </div>
      )}

      <div className="w-full max-w-[960px] mt-10 flex flex-col gap-6">
        {loading ? <StripSkeleton /> : firstRun ? <FirstRunState /> : <RecentContactsStrip contacts={savedContacts} />}
        {!loading && (
          <div className="text-center text-[11.5px] font-mono-tag text-ink-4" style={{ letterSpacing: "0.08em" }}>
            warmly · coach active
          </div>
        )}
      </div>
    </div>
  );
}
