"use client";

/**
 * components/v2/contacts/ContactsList.tsx
 * Full contacts list view: saved-today cards + filterable all-contacts table.
 * Fetches from GET /api/contacts with the API contract from the spec.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Contact } from "@/types/database";
import { Icon } from "@/components/v2/icons";
import { ContactRow } from "./ContactRow";
import { SavedTodayCard } from "./SavedTodayCard";
import { ContactsListSkeleton, SavedTodayCardSkeleton } from "./ContactsListSkeleton";
import { EmptySavedToday, EmptyContacts, ErrorState } from "./ContactsEmptyStates";
import { ContactsFilterBar, type FilterId } from "./ContactsFilterBar";
import { isSavedToday, deriveFollowUpDue } from "./contactsUtils";
import type { ContactStatusValue } from "@/components/v2/primitives";

interface ApiListResponse {
  data: { items: Contact[]; total: number; page: number; per_page: number; has_more: boolean };
  error?: string;
}

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchContacts = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        user_action: "saved",
        sort_by: "relevance_score",
        sort_order: "desc",
        per_page: "50",
        lite: "true",
      });
      if (q) params.set("search", q);
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiListResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setContacts(json.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchContacts(); }, [fetchContacts]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveSearch(val);
      void fetchContacts(val || undefined);
    }, 350);
  };

  const savedToday = contacts.filter((c) =>
    (c.user_action === "saved" || c.user_action === "starred") &&
    isSavedToday(c.reviewed_at, c.created_at)
  );

  const allFiltered = contacts.filter((c) => {
    if (filter === "all") return true;
    if (filter === "followup") return deriveFollowUpDue(c.status as ContactStatusValue, c.last_interaction_at);
    return c.status === filter;
  });

  const counts = {
    total: contacts.length,
    met: contacts.filter((c) => c.status === "met").length,
    followup: contacts.filter((c) => deriveFollowUpDue(c.status as ContactStatusValue, c.last_interaction_at)).length,
  };

  return (
    <div className="px-12 pt-12 pb-16 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between mb-8 fade-up flex-wrap gap-3">
        <h1 className="font-display text-ink" style={{ fontSize: 36, lineHeight: 1.05 }}>Contacts</h1>
        <div className="text-[12.5px] text-ink-3">
          {counts.total} contacts · {counts.met} met · {counts.followup} follow-up due
        </div>
      </div>

      {/* Saved today */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[15px] font-semibold text-ink leading-none">Saved today</h2>
          <span className="inline-flex items-center px-2 h-[20px] rounded-full text-[10.5px] font-medium font-mono" style={{ background: "#f3e2cd", color: "#7a4a25", letterSpacing: "0.06em" }}>
            {loading ? "—" : savedToday.length}
          </span>
          <div className="flex-1 h-px ml-2" style={{ background: "#e5d8be" }} />
          {savedToday.length > 0 && (
            <Link href="/v2/discover" className="text-[12px] inline-flex items-center gap-1" style={{ color: "#7a4a25", textDecoration: "none" }}>
              Discover more <Icon.ArrowRight size={11} />
            </Link>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-5">{Array.from({ length: 3 }).map((_, i) => <SavedTodayCardSkeleton key={i} />)}</div>
        ) : savedToday.length === 0 ? (
          <EmptySavedToday />
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {savedToday.slice(0, 6).map((c, idx) => <SavedTodayCard key={c.id} contact={c} animationDelay={idx * 40} />)}
          </div>
        )}
      </section>

      {/* All contacts */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[15px] font-semibold text-ink leading-none">All contacts</h2>
        <div className="flex-1 h-px ml-2" style={{ background: "#e5d8be" }} />
      </div>

      <ContactsFilterBar
        filter={filter}
        onFilterChange={setFilter}
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
      />

      {loading ? (
        <ContactsListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchContacts(activeSearch || undefined)} />
      ) : allFiltered.length === 0 ? (
        <EmptyContacts filter={filter} hasSearch={!!activeSearch} />
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5d8be" }}>
          {allFiltered.map((c) => <ContactRow key={c.id} contact={c} />)}
        </div>
      )}
    </div>
  );
}
