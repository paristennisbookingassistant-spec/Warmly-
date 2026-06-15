/**
 * components/v2/contacts/sort/SortHeader.tsx
 * Page header for the "Sort your network" flow — back link, title, keyboard hint.
 */

import Link from "next/link";
import { Icon } from "@/components/v2/icons";

export function SortHeader() {
  return (
    <div className="flex items-start justify-between mb-10 fade-up">
      <div>
        <Link
          href="/v2/contacts"
          className="inline-flex items-center gap-1.5 mb-3 text-[12.5px] transition-opacity"
          style={{ color: "var(--ink-4)", textDecoration: "none" }}
        >
          <Icon.ArrowLeft size={13} />
          Contacts
        </Link>
        <h1
          className="font-display"
          style={{ fontSize: 32, color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
        >
          Sort your network
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--ink-3)" }}>
          Assign a relationship category — Warmly will remind you when to reconnect.
        </p>
      </div>
      <div
        className="hidden md:flex flex-col items-end gap-1 text-[11px] mt-1"
        style={{ color: "var(--ink-4)" }}
      >
        <span>1 – 4 &nbsp;pick category</span>
        <span>→ &nbsp;skip</span>
      </div>
    </div>
  );
}
