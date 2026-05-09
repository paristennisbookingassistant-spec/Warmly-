"use client";

import { useMemo } from "react";
import type { Contact } from "@/types/database";
import ContactCard from "./ContactCard";
import { ContactCardSkeleton } from "@/components/ui/Skeleton";
import { getRelationshipHealthFromDate } from "@/lib/utils/matchSignals";

interface ContactGroupedViewProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpenSession?: (contact: Contact) => void;
  onViewDetail?: (contact: Contact) => void;
}

const SECTION_ORDER = [
  "Needs attention",
  "In motion",
  "Recently discovered",
] as const;

type Section = (typeof SECTION_ORDER)[number];

function categorize(contact: Contact): Section {
  const health = getRelationshipHealthFromDate(contact.last_interaction_at);
  if (
    health === "red" ||
    (contact.status === "ongoing" && health === "yellow")
  ) {
    return "Needs attention";
  }
  if (contact.status === "discovered") {
    return "Recently discovered";
  }
  return "In motion";
}

export default function ContactGroupedView({
  contacts,
  isLoading = false,
  onOpenSession,
  onViewDetail,
}: ContactGroupedViewProps) {
  const grouped = useMemo(() => {
    const map: Record<Section, Contact[]> = {
      "Needs attention": [],
      "In motion": [],
      "Recently discovered": [],
    };
    for (const c of contacts) {
      map[categorize(c)].push(c);
    }
    return map;
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContactCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-lg"
        style={{
          background: "var(--surface)",
          border: "1px dashed var(--line)",
        }}
      >
        <p className="text-[14px]" style={{ color: "var(--ink-2)" }}>
          No contacts match your filters.
        </p>
        <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-3)" }}>
          Try a different search or clear the filter pills.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {SECTION_ORDER.map((section) => {
        const list = grouped[section];
        if (list.length === 0) return null;
        return (
          <section key={section}>
            <div className="flex items-baseline gap-3 mb-4">
              <h3
                className="font-display italic text-[20px] leading-tight tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                {section}
              </h3>
              <span
                className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                style={{ color: "var(--ink-3)" }}
              >
                {list.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {list.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onOpenSession={onOpenSession}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
