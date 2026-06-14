"use client";

/**
 * components/v2/contacts/ReconnectRow.tsx
 * Module 6 — Row variant for the "Due to reconnect" filtered view.
 * Shows contact info + overdue indicator + "Draft re-touch" action button.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { relativeTime } from "./contactsUtils";
import { CATEGORY_LABEL } from "@/lib/crm/cadence";
import { DraftReTouchButton } from "./DraftReTouchButton";

interface ReconnectRowProps {
  contact: Contact;
}

function daysOverdue(nextTouchAt: string | null): string {
  if (!nextTouchAt) return "";
  const ms = Date.now() - new Date(nextTouchAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "due today";
  if (days === 1) return "1d overdue";
  return `${days}d overdue`;
}

export function ReconnectRow({ contact: c }: ReconnectRowProps) {
  const lastContact = relativeTime(c.last_interaction_at);
  const catLabel = c.relationship_category ? CATEGORY_LABEL[c.relationship_category] : null;
  const overdueLabel = daysOverdue(c.next_touch_at);

  return (
    <div
      className="w-full flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 transition-colors"
      style={{ borderColor: "#f0e6d0" }}
    >
      <Link
        href={`/v2/contacts/${c.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
        style={{ textDecoration: "none" }}
      >
        <Avatar src={c.photo_url ?? c.avatar_url} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13.5px] font-medium text-ink truncate">{c.name}</span>
            <span className="text-[12px] text-ink-3 truncate">
              {c.current_title ? `· ${c.current_title}` : ""}
              {c.company ? ` · ${c.company}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {catLabel && (
              <span className="text-[11.5px] text-ink-4">{catLabel}</span>
            )}
            <span className="text-[11.5px] text-ink-4">Last: {lastContact}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium"
          style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
        >
          <Icon.Alert size={10} />
          {overdueLabel}
        </span>

        <DraftReTouchButton
          contactId={c.id}
          contactName={c.name}
          lastInteractionAt={c.last_interaction_at}
          category={c.relationship_category}
          size="sm"
        />

        <Link href={`/v2/contacts/${c.id}`}>
          <Icon.ChevronRight size={14} className="text-ink-4" />
        </Link>
      </div>
    </div>
  );
}
