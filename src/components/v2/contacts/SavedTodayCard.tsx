"use client";

/**
 * components/v2/contacts/SavedTodayCard.tsx
 * Card shown in the "Saved today" horizontal row. Ported from contacts.jsx
 * SavedTodayCard. Navigates to /v2/contacts/{id} on click.
 */

import Link from "next/link";
import type { Contact } from "@/types/database";
import { Avatar, TierBadge, InseadPill } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { detectInsead } from "./contactsUtils";

interface SavedTodayCardProps {
  contact: Contact;
  animationDelay?: number;
}

export function SavedTodayCard({ contact: c, animationDelay = 0 }: SavedTodayCardProps) {
  const isLinkedIn = c.source === "discovery";
  const palette = isLinkedIn
    ? { accent: "#4a6f87", soft: "#dde6ee", ink: "#2f4d63" }
    : { accent: "#b87a4a", soft: "#f3e2cd", ink: "#7a4a25" };

  const inseadShort = detectInsead(c.education_v2);

  return (
    <Link
      href={`/v2/contacts/${c.id}`}
      className="bg-white rounded-2xl card-hover overflow-hidden block fade-up"
      style={{
        border: "1px solid #e5d8be",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 2px 8px rgba(31,27,22,0.03)",
        animationDelay: `${animationDelay}ms`,
        textDecoration: "none",
      }}
    >
      {/* Source ribbon */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ background: palette.soft, borderColor: `${palette.accent}33` }}
      >
        {isLinkedIn ? (
          <>
            <Icon.Network size={12} style={{ color: palette.accent }} />
            <span className="text-[11.5px] leading-tight" style={{ color: palette.ink }}>
              From <span className="font-semibold">LinkedIn Network</span>
            </span>
          </>
        ) : (
          <>
            <Icon.Book size={12} style={{ color: palette.accent }} />
            <span className="text-[11.5px] leading-tight" style={{ color: palette.ink }}>
              From <span className="font-semibold">INSEAD CV book</span>
            </span>
          </>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar (LinkedIn CDN) */}
          <Avatar src={c.photo_url ?? c.avatar_url} size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold text-ink leading-tight truncate">{c.name}</div>
            <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">
              {c.current_title}
              {c.company ? ` · ${c.company}` : ""}
            </div>
            {c.location && (
              <div className="text-[11.5px] text-ink-4 mt-0.5">{c.location}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {inseadShort && <InseadPill>{inseadShort}</InseadPill>}
          {c.tier && (
            <TierBadge
              tier={c.tier === 1 ? "Strong" : c.tier === 2 ? "Good" : "Adjacent"}
            />
          )}
        </div>

        {c.recommendation_reason && (
          <p
            className="text-[12.5px] text-ink-2 leading-relaxed italic"
            style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            &ldquo;{c.recommendation_reason}&rdquo;
          </p>
        )}

        <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "#ece2d0" }}>
          <span className="text-[11px] text-ink-4">Saved recently</span>
          <span className="text-[11.5px] font-medium inline-flex items-center gap-1" style={{ color: palette.ink }}>
            View profile
            <Icon.ChevronRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}
