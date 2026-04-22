"use client";

import { useState } from "react";
import type { Contact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
  onOpenSession?: (contact: Contact) => void;
  onViewDetail?: (contact: Contact) => void;
}

const TIER_CONFIG: Record<
  number,
  { label: string; bg: string; text: string; bar: string }
> = {
  1: {
    label: "A",
    bg: "bg-[#ecfdf5]",
    text: "text-[#059669]",
    bar: "bg-[#059669]",
  },
  2: {
    label: "B",
    bg: "bg-[#eff6ff]",
    text: "text-[#2563eb]",
    bar: "bg-[#2563eb]",
  },
  3: {
    label: "C",
    bg: "bg-[#fef3c7]",
    text: "text-[#d97706]",
    bar: "bg-[#d97706]",
  },
};

function ScoreDots({ score }: { score: number }) {
  const filled = Math.round((score / 10) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i < filled ? "bg-[#2563eb]" : "bg-black/[0.08]"
          )}
        />
      ))}
    </div>
  );
}

export default function ContactCard({
  contact,
  onOpenSession,
  onViewDetail,
}: ContactCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const tier = contact.tier;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <div
      className="relative bg-white rounded-xl border border-[rgba(0,0,0,0.06)] cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        boxShadow: isHovered
          ? "0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)"
          : "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)",
        transform: isHovered ? "translateY(-1px)" : "translateY(0)",
      }}
      onClick={() => onViewDetail?.(contact)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tier accent bar */}
      {tierCfg && (
        <div className={cn("absolute top-0 left-0 right-0 h-[2px]", tierCfg.bar)} />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <Avatar name={contact.name} src={contact.avatar_url ?? null} size="md" />
            <div className="min-w-0">
              <h3 className="font-semibold text-[#171717] text-[14px] leading-tight truncate">
                {contact.name}
              </h3>
              {(contact.current_title || contact.company) && (
                <p className="text-[13px] text-[#525252] mt-0.5 leading-tight">
                  {[contact.current_title, contact.company]
                    .filter(Boolean)
                    .join(" at ")}
                </p>
              )}
              {contact.career_history?.[0] && (
                <p className="text-[11px] text-[#a3a3a3] mt-0.5 truncate">
                  Previously: {contact.career_history[0].title} at{" "}
                  {contact.career_history[0].company}
                </p>
              )}
              {contact.location && (
                <p className="text-[11px] text-[#a3a3a3] mt-0.5 flex items-center gap-0.5">
                  <svg
                    className="w-2.5 h-2.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {contact.location}
                </p>
              )}
            </div>
          </div>

          {tierCfg && (
            <div
              className={cn(
                "flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                tierCfg.bg,
                tierCfg.text
              )}
            >
              {tierCfg.label}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-black/[0.04] mb-3" />

        {/* Score row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {contact.relevance_score !== null ? (
              <>
                <span className="text-[13px] font-bold text-[#171717] font-mono tabular-nums">
                  {Math.round(contact.relevance_score * 10)}
                </span>
                <ScoreDots score={contact.relevance_score} />
              </>
            ) : (
              <span className="text-[12px] text-[#a3a3a3]">Not scored</span>
            )}
          </div>
          {contact.last_interaction_at && (
            <span className="text-[11px] text-[#a3a3a3]">
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          )}
        </div>

        {/* Recommendation reason */}
        {contact.recommendation_reason && (
          <p className="mt-2.5 text-[12px] text-[#525252] leading-relaxed line-clamp-2">
            {contact.recommendation_reason}
          </p>
        )}
      </div>

      {/* Hover quick actions */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-[rgba(0,0,0,0.06)] transition-all duration-150",
          isHovered
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 pointer-events-none"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSession?.(contact);
          }}
          className="flex-1 py-1.5 rounded-full bg-[#171717] text-white text-[12px] font-medium hover:bg-[#2a2a2a] transition-all duration-150 text-center"
        >
          Open chat
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail?.(contact);
          }}
          className="flex-1 py-1.5 rounded-full bg-white text-[#171717] text-[12px] font-medium border border-[rgba(0,0,0,0.1)] hover:bg-[#f5f5f5] transition-all duration-150 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          View profile
        </button>
      </div>
    </div>
  );
}
