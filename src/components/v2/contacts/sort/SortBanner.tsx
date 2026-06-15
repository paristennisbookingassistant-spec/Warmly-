/**
 * components/v2/contacts/sort/SortBanner.tsx
 * Entry-point affordance shown on the Contacts page when uncategorized contacts exist.
 * Links to /v2/contacts/sort.
 */

import Link from "next/link";
import { Icon } from "@/components/v2/icons";

interface SortBannerProps {
  count: number;
}

export function SortBanner({ count }: SortBannerProps) {
  if (count === 0) return null;

  return (
    <Link
      href="/v2/contacts/sort"
      className="flex items-center gap-4 rounded-xl px-5 py-4 mb-8 transition-all duration-150 hover:shadow-medium group"
      style={{
        background: "var(--accent-soft)",
        border: "1px solid var(--line)",
        textDecoration: "none",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <Icon.Users size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-ink leading-none mb-0.5">
          Sort your network
        </div>
        <div className="text-[12px] text-ink-3 leading-snug">
          {count} contact{count !== 1 ? "s" : ""} without a relationship category — assign them to start getting reconnect reminders.
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 text-[12.5px] font-medium flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
        style={{ color: "var(--accent-ink)" }}
      >
        Sort {count} →
      </div>
    </Link>
  );
}
