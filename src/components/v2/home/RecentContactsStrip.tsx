"use client";

/**
 * components/v2/home/RecentContactsStrip.tsx
 * Horizontal scrollable strip of recently saved contacts.
 * Each card links to /v2/contacts/{id}.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar, StatusBadge } from "@/components/v2/primitives";
import type { ContactStatusValue } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

interface RecentContactsStripProps {
  contacts: Contact[];
}

export function RecentContactsStrip({ contacts }: RecentContactsStripProps) {
  if (contacts.length === 0) return null;

  return (
    <div
      className="bg-white border rounded-2xl px-6 py-5"
      style={{
        borderColor: "#e5d8be",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="font-mono-tag text-ink-4">Recent contacts</div>
        <span
          className="text-[11.5px] font-medium px-2 h-[20px] rounded-full inline-flex items-center"
          style={{ background: "#f3e2cd", color: "#7a4a25", fontFamily: '"JetBrains Mono", monospace' }}
        >
          {contacts.length}
        </span>
        <div className="flex-1 h-px" style={{ background: "#ece2d0" }} />
      </div>

      <div className="flex items-center gap-3 overflow-x-auto scroll-area pb-1">
        {contacts.map((c) => (
          <ContactChip key={c.id} contact={c} />
        ))}
      </div>
    </div>
  );
}

function ContactChip({ contact: c }: { contact: Contact }) {
  const status = c.status as ContactStatusValue;
  return (
    <Link
      href={`/v2/contacts/${c.id}`}
      className="flex items-center gap-3 flex-shrink-0 px-3 py-2 rounded-xl border transition-colors text-left"
      style={{ borderColor: "#e5d8be", minWidth: 240, textDecoration: "none" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(243,226,205,0.25)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "";
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
      <Avatar src={c.photo_url ?? c.avatar_url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink truncate">{c.name}</div>
        <div className="text-[11.5px] text-ink-3 truncate">
          {c.current_title ?? ""}
          {c.company ? ` · ${c.company}` : ""}
        </div>
      </div>
      <StatusBadge status={status} />
      <Icon.ChevronRight size={12} className="text-ink-4 flex-shrink-0" />
    </Link>
  );
}
