"use client";

import { useState, useMemo } from "react";
import type { Contact } from "@/types/database";
import ContactCard from "./ContactCard";
import { ContactCardSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface ContactGridProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpenSession?: (contact: Contact) => void;
  onViewDetail?: (contact: Contact) => void;
}

type TierFilter = "all" | 1 | 2 | 3;
type SortOption = "score" | "name" | "recent";

export default function ContactGrid({
  contacts,
  isLoading = false,
  onOpenSession,
  onViewDetail,
}: ContactGridProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sort, setSort] = useState<SortOption>("score");

  const filtered = useMemo(() => {
    let result = contacts;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.current_title?.toLowerCase().includes(q)
      );
    }

    if (tierFilter !== "all") {
      result = result.filter((c) => c.tier === tierFilter);
    }

    result = [...result].sort((a, b) => {
      if (sort === "score") {
        return (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
      }
      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }
      // recent
      const aTime = a.last_interaction_at ?? a.discovered_at;
      const bTime = b.last_interaction_at ?? b.discovered_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return result;
  }, [contacts, search, tierFilter, sort]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <FilterBarSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ContactCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/[0.1] rounded-lg text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-black/[0.04] focus:border-black/[0.2] transition-all"
          />
        </div>

        {/* Tier filter pills */}
        <div className="flex items-center gap-1 bg-black/[0.04] p-1 rounded-lg">
          {(
            [
              { value: "all", label: "All" },
              { value: 1, label: "A" },
              { value: 2, label: "B" },
              { value: 3, label: "C" },
            ] as Array<{ value: TierFilter; label: string }>
          ).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setTierFilter(opt.value)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
                tierFilter === opt.value
                  ? "bg-white text-[#171717] shadow-sm"
                  : "text-[#525252] hover:text-[#171717]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2 text-sm bg-white border border-black/[0.1] rounded-lg text-[#171717] focus:outline-none focus:ring-2 focus:ring-black/[0.04] focus:border-black/[0.2] transition-all cursor-pointer"
        >
          <option value="score">Score (high to low)</option>
          <option value="name">Name (A–Z)</option>
          <option value="recent">Recent first</option>
        </select>

        {/* Result count */}
        <span className="text-xs text-[#a3a3a3] ml-auto whitespace-nowrap">
          {filtered.length} of {contacts.length}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={search !== "" || tierFilter !== "all"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onOpenSession={onOpenSession}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-black/[0.04] flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-[#a3a3a3]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#171717]">
        {hasFilters ? "No contacts match your filters" : "No contacts yet"}
      </h3>
      <p className="text-sm text-[#525252] mt-1.5 max-w-xs leading-relaxed">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "Start a discovery session or add contacts manually in the chat."}
      </p>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 bg-black/[0.04] rounded-lg flex-1 animate-pulse" />
      <div className="h-9 w-36 bg-black/[0.04] rounded-lg animate-pulse" />
      <div className="h-9 w-40 bg-black/[0.04] rounded-lg animate-pulse" />
    </div>
  );
}
