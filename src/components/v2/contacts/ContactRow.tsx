"use client";

/**
 * components/v2/contacts/ContactRow.tsx
 * Single row in the "All contacts" table. Ported from the contacts.jsx row button.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar, StatusBadge } from "@/components/v2/primitives";
import { Icon, WhatsAppIcon } from "@/components/v2/icons";
import { relativeTime, deriveFollowUpDue, detectInsead, phoneToWaLink } from "./contactsUtils";
import type { ContactStatusValue } from "@/components/v2/primitives";
import { suggestCategory } from "@/lib/crm/suggestCategory";
import { CATEGORY_LABEL } from "@/lib/crm/cadence";

interface ContactRowProps {
  contact: Contact;
}

export function ContactRow({ contact: c }: ContactRowProps) {
  const status = c.status as ContactStatusValue;
  const followUpDue = deriveFollowUpDue(status, c.last_interaction_at);
  const lastContact = relativeTime(c.last_interaction_at);
  const inseadShort = detectInsead(c.education_v2);

  // Subtle suggestion indicator for uncategorized contacts
  const suggestion = c.relationship_category === null ? suggestCategory(c) : null;

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

      {suggestion && (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 h-[20px] rounded-full text-[11px] font-medium flex-shrink-0"
          style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
          title={`Suggested: ${CATEGORY_LABEL[suggestion.category]}`}
        >
          <span
            className="w-[5px] h-[5px] rounded-full inline-block"
            style={{ background: "#9ca3af" }}
          />
          {CATEGORY_LABEL[suggestion.category]}
        </span>
      )}

      <div className="text-[12px] text-ink-3 w-[72px] text-right inline-flex items-center justify-end gap-1">
        {followUpDue && <Icon.Alert size={11} className="text-warn" />}
        <span>{lastContact}</span>
      </div>

      {c.phone ? (
        <a
          href={phoneToWaLink(c.phone)}
          target="_blank"
          rel="noopener noreferrer"
          title="Message on WhatsApp"
          aria-label="Message on WhatsApp"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150"
          style={{ color: "#16a34a" }}
        >
          <WhatsAppIcon size={14} />
        </a>
      ) : (
        <span className="w-6 flex-shrink-0" />
      )}

      <Icon.ChevronRight size={14} className="text-ink-4" />
    </Link>
  );
}
