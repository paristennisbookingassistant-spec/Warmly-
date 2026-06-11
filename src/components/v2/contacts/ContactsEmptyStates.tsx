"use client";

/**
 * components/v2/contacts/ContactsEmptyStates.tsx
 * Empty + error state components used by ContactsList.
 */

import Link from "next/link";
import { Btn } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import type { ContactStatus } from "@/types/database";

type FilterId = "all" | ContactStatus | "followup";

export function EmptySavedToday() {
  return (
    <div
      className="rounded-2xl border px-6 py-10 flex items-center justify-between gap-4"
      style={{
        borderColor: "#d9cdb4",
        background: "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(229,216,190,0.3) 6px, rgba(229,216,190,0.3) 7px)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#f3e2cd", color: "#b87a4a" }}>
          <Icon.HeartFill size={16} />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink mb-0.5">No contacts saved today yet</div>
          <div className="text-[12.5px] text-ink-3">Open Discover, swipe through alumni, and saved leads land here.</div>
        </div>
      </div>
      <Link href="/v2/discover">
        <Btn variant="sienna-soft" iconRight={Icon.ArrowRight} size="sm">Open Discover</Btn>
      </Link>
    </div>
  );
}

interface EmptyContactsProps {
  filter: FilterId;
  hasSearch: boolean;
}

export function EmptyContacts({ filter, hasSearch }: EmptyContactsProps) {
  return (
    <div className="bg-white rounded-2xl border px-6 py-16 flex flex-col items-center gap-4 text-center" style={{ border: "1px solid #e5d8be" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#f3e2cd", color: "#b87a4a" }}>
        <Icon.Users size={20} />
      </div>
      <div>
        <div className="text-[14.5px] font-semibold text-ink mb-1">
          {hasSearch
            ? "No contacts match your search"
            : filter === "followup"
            ? "No follow-ups due"
            : "No contacts yet"}
        </div>
        <div className="text-[13px] text-ink-3">
          {hasSearch
            ? "Try a different name or company."
            : filter !== "all"
            ? "Try removing the filter."
            : "Start by discovering contacts in the Discover view."}
        </div>
      </div>
      {!hasSearch && filter === "all" && (
        <Link href="/v2/discover">
          <Btn variant="sienna-soft" size="sm" icon={Icon.Compass}>Open Discover</Btn>
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border px-6 py-16 flex flex-col items-center gap-4 text-center" style={{ border: "1px solid #e5d8be" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7", color: "#92400e" }}>
        <Icon.Alert size={20} />
      </div>
      <div>
        <div className="text-[14.5px] font-semibold text-ink mb-1">Failed to load contacts</div>
        <div className="text-[12.5px] text-ink-3">{message}</div>
      </div>
      <Btn variant="secondary" size="sm" onClick={onRetry}>Retry</Btn>
    </div>
  );
}
