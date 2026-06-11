"use client";

/**
 * components/v2/home/PickupCard.tsx
 * "Pick up where you left off" action card.
 * Links to the most-relevant saved contact.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Icon } from "@/components/v2/icons";
import { Avatar, StatusBadge } from "@/components/v2/primitives";
import type { ContactStatusValue } from "@/components/v2/primitives";

const P = {
  accent: "#b87a4a",
  soft: "#f3e2cd",
  border: "#e5d8be",
  borderHover: "#b87a4a",
  shadowBase: "0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)",
  shadowHover: "0 0 0 1px #b87a4a inset, 0 14px 32px rgba(184,122,74,0.10)",
};

interface PickupCardProps {
  contacts: Contact[];
  resumeContact: Contact;
}

export function PickupCard({ contacts, resumeContact }: PickupCardProps) {
  const status = resumeContact.status as ContactStatusValue;

  return (
    <Link
      href={`/v2/contacts/${resumeContact.id}`}
      className="group bg-white border rounded-3xl text-left flex flex-col overflow-hidden relative transition-all duration-200"
      style={{ borderColor: P.border, boxShadow: P.shadowBase, textDecoration: "none" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = P.borderHover;
        el.style.boxShadow = P.shadowHover;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = P.border;
        el.style.boxShadow = P.shadowBase;
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: P.accent }} />

      <PickupHeader contacts={contacts} />

      <div className="flex-1 flex flex-col">
        <div className="px-8 py-4 flex-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#fbf6ec" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
            <Avatar src={resumeContact.photo_url ?? resumeContact.avatar_url} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-ink truncate">{resumeContact.name}</div>
              <div className="text-[11.5px] text-ink-3 truncate">
                {resumeContact.current_title ?? ""}
                {resumeContact.company ? ` · ${resumeContact.company}` : ""}
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: "#ece2d0" }}>
          <span className="text-[11.5px] text-ink-3">Resume where you stopped</span>
          <span
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-medium transition-all group-hover:scale-[1.03]"
            style={{ background: P.accent, color: "#ffffff" }}
          >
            Continue
            <Icon.ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PickupHeader({ contacts }: { contacts: Contact[] }) {
  const accent = P.accent;
  return (
    <div
      className="px-8 pt-8 pb-6 relative overflow-hidden flex flex-col justify-end"
      style={{ background: "radial-gradient(circle at 92% 18%, #fdf3e1 0%, #faecd2 70%)", minHeight: 196 }}
    >
      <div
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(184,122,74,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-mono-tag mb-2" style={{ color: accent }}>Inbox · in progress</div>
          <div className="font-display text-ink leading-tight mb-2" style={{ fontSize: 30 }}>
            Pick up where you<br />left off
          </div>
          <div className="text-[13.5px] text-ink-2">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"} saved
          </div>
        </div>
        <PickupIllustration accent={accent} />
      </div>
    </div>
  );
}

function PickupIllustration({ accent }: { accent: string }) {
  return (
    <svg width="120" height="100" viewBox="0 0 140 120" className="flex-shrink-0">
      <g transform="translate(28 18) rotate(-7 40 30)">
        <rect width="82" height="60" rx="6" fill="#ffffff" stroke={accent} strokeOpacity="0.32" />
        <rect x="11" y="14" width="44" height="3" rx="1.5" fill={accent} opacity="0.22" />
        <rect x="11" y="22" width="58" height="3" rx="1.5" fill={accent} opacity="0.16" />
        <rect x="11" y="30" width="34" height="3" rx="1.5" fill={accent} opacity="0.16" />
      </g>
      <g transform="translate(18 28) rotate(3 40 30)">
        <rect width="82" height="60" rx="6" fill="#ffffff" stroke={accent} strokeOpacity="0.42" />
        <rect x="11" y="14" width="38" height="3" rx="1.5" fill={accent} opacity="0.32" />
        <rect x="11" y="22" width="60" height="3" rx="1.5" fill={accent} opacity="0.2" />
        <rect x="11" y="30" width="44" height="3" rx="1.5" fill={accent} opacity="0.2" />
      </g>
      <g transform="translate(12 42)">
        <rect width="94" height="66" rx="7" fill="#ffffff" stroke={accent} strokeWidth="1.5" />
        <rect x="12" y="14" width="42" height="4" rx="2" fill={accent} />
        <rect x="12" y="25" width="70" height="3" rx="1.5" fill={accent} opacity="0.45" />
        <rect x="12" y="33" width="58" height="3" rx="1.5" fill={accent} opacity="0.45" />
        <rect x="12" y="41" width="38" height="3" rx="1.5" fill={accent} opacity="0.45" />
        <rect x="52" y="39" width="1.5" height="8" fill={accent}>
          <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
        </rect>
      </g>
    </svg>
  );
}
