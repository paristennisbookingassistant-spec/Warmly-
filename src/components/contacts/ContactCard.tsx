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
  { label: string; bg: string; text: string; dot: string }
> = {
  1: { label: "A", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  2: { label: "B", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  3: { label: "C", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
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
            i < filled ? "bg-blue-500" : "bg-gray-200"
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
      className="relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 cursor-pointer overflow-hidden"
      onClick={() => onViewDetail?.(contact)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tier accent bar */}
      {tierCfg && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-0.5",
            tier === 1 && "bg-emerald-400",
            tier === 2 && "bg-blue-400",
            tier === 3 && "bg-amber-400"
          )}
        />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <Avatar name={contact.name} size="md" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {contact.name}
              </h3>
              {(contact.current_title || contact.company) && (
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                  {[contact.current_title, contact.company]
                    .filter(Boolean)
                    .join(" at ")}
                </p>
              )}
              {contact.location && (
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
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
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                tierCfg.bg,
                tierCfg.text
              )}
            >
              {tierCfg.label}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 mb-3" />

        {/* Score row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {contact.relevance_score !== null ? (
              <>
                <span className="text-sm font-bold text-gray-800 font-mono">
                  {Math.round(contact.relevance_score * 10)}
                </span>
                <ScoreDots score={contact.relevance_score} />
              </>
            ) : (
              <span className="text-xs text-gray-400">Not scored</span>
            )}
          </div>
          {contact.last_interaction_at && (
            <span className="text-[10px] text-gray-400">
              {formatRelativeTime(contact.last_interaction_at)}
            </span>
          )}
        </div>

        {/* Recommendation reason */}
        {contact.recommendation_reason && (
          <p className="mt-2.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
            {contact.recommendation_reason}
          </p>
        )}
      </div>

      {/* Hover quick actions */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-slate-100 transition-all duration-150",
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
          className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors text-center"
        >
          Open chat
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail?.(contact);
          }}
          className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors text-center"
        >
          View profile
        </button>
      </div>
    </div>
  );
}
