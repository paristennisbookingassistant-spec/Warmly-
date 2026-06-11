"use client";

/**
 * components/v2/contacts/ContactRow.tsx
 * Single row in the "All contacts" table. Ported from the contacts.jsx row button.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar, StatusBadge } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { relativeTime, deriveFollowUpDue, detectInsead } from "./contactsUtils";
import type { ContactStatusValue } from "@/components/v2/primitives";

interface ContactRowProps {
  contact: Contact;
}

export function ContactRow({ contact: c }: ContactRowProps) {
  const status = c.status as ContactStatusValue;
  const followUpDue = deriveFollowUpDue(status, c.last_interaction_at);
  const lastContact = relativeTime(c.last_interaction_at);
  const inseadShort = detectInsead(c.education_v2);

  return (
    <Link
      href={`/v2/contacts/${c.id}`}
      className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors border-b last:border-b-0"
      style={{ borderColor: "#f0e6d0", textDecoration: "none", display: "flex" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(243,226,205,0.25)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "";
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
      <Avatar src={c.photo_url ?? c.avatar_url} size={36} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-ink truncate">{c.name}</span>
          <span className="text-[12px] text-ink-3 truncate">
            {c.current_title ? `· ${c.current_title}` : ""}
            {c.company ? ` · ${c.company}` : ""}
          </span>
          {inseadShort && (
            <span className="text-[11.5px] text-ink-4 hidden md:inline">· INSEAD {inseadShort}</span>
          )}
        </div>
      </div>

      <StatusBadge status={status} followUpDue={followUpDue} />

      <div className="text-[12px] text-ink-3 w-[72px] text-right inline-flex items-center justify-end gap-1">
        {followUpDue && <Icon.Alert size={11} className="text-warn" />}
        <span>{lastContact}</span>
      </div>

      <Icon.ChevronRight size={14} className="text-ink-4" />
    </Link>
  );
}
