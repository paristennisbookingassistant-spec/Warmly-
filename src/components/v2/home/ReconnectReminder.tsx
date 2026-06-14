/**
 * components/v2/home/ReconnectReminder.tsx
 * Module 7 — Compact strip on the V2 home page showing contacts due to reconnect.
 * Renders null when 0 are due. Shows up to 3 names + "View all →" link.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

interface ReconnectReminderProps {
  contacts: Contact[];
}

export function ReconnectReminder({ contacts }: ReconnectReminderProps) {
  if (contacts.length === 0) return null;

  const preview = contacts.slice(0, 3);
  const total = contacts.length;

  return (
    <div
      className="w-full max-w-[960px] rounded-2xl px-6 py-4 flex items-center justify-between gap-4 fade-up"
      style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          <Icon.Alert size={16} />
        </div>
        <div>
          <div className="text-[13.5px] font-semibold text-ink">
            {total === 1 ? "1 person due to reconnect" : `${total} people due to reconnect`}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {preview.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <Avatar src={c.photo_url ?? c.avatar_url} size={20} />
                <span className="text-[12px] text-ink-3">{c.name.split(" ")[0]}</span>
              </div>
            ))}
            {total > 3 && (
              <span className="text-[12px] text-ink-4">+{total - 3} more</span>
            )}
          </div>
        </div>
      </div>

      <Link
        href="/v2/contacts?filter=reconnect"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium flex-shrink-0 transition-opacity hover:opacity-80"
        style={{ color: "#92400e", textDecoration: "none" }}
      >
        View all
        <Icon.ArrowRight size={13} />
      </Link>
    </div>
  );
}

/** Skeleton shown while home data is loading */
export function ReconnectReminderSkeleton() {
  return (
    <div
      className="w-full max-w-[960px] rounded-2xl px-6 py-4 flex items-center gap-4"
      style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
    >
      <div className="w-9 h-9 rounded-xl skeleton-pulse" style={{ background: "#fde68a" }} />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-3.5 w-48 rounded skeleton-pulse" style={{ background: "#fde68a" }} />
        <div className="h-3 w-32 rounded skeleton-pulse" style={{ background: "#fde68a", opacity: 0.6 }} />
      </div>
    </div>
  );
}
