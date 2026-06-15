"use client";

/**
 * components/v2/warm-intros/WarmIntroCard.tsx
 * A single warm-intro candidate card.
 *
 * Hero element: "via {peer}" provenance chip.
 * CTA: "Ask {peer} for an intro" → triggers draft flow in parent.
 */

import { Avatar } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

export interface WarmIntroCard {
  candidate: {
    name: string;
    title: string | null;
    company: string | null;
    linkedin_url: string | null;
  };
  via: {
    peer_name: string;
    peer_contact_id: string;
  };
  match_reason: string;
}

interface WarmIntroCardProps {
  card: WarmIntroCard;
  onAskIntro: (card: WarmIntroCard) => void;
  drafting: boolean;
}

export function WarmIntroCardView({ card, onAskIntro, drafting }: WarmIntroCardProps) {
  const { candidate, via } = card;
  const peerFirst = via.peer_name.split(" ")[0];

  return (
    <div
      className="bg-white border rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        borderColor: "#e5d8be",
        boxShadow: "0 1px 0 rgba(31,27,22,0.03), 0 2px 8px rgba(31,27,22,0.03)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(31,27,22,0.08), 0 0 0 1px #e5d8be";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 1px 0 rgba(31,27,22,0.03), 0 2px 8px rgba(31,27,22,0.03)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Candidate identity */}
      <div className="flex items-start gap-3">
        <Avatar name={candidate.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-ink leading-snug truncate">
            {candidate.name}
          </div>
          {(candidate.title ?? candidate.company) && (
            <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">
              {[candidate.title, candidate.company].filter(Boolean).join(" @ ")}
            </div>
          )}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-[11.5px] transition-colors hover:underline"
              style={{ color: "#4a6f87" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon.Link size={11} />
              LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Match reason */}
      <p
        className="text-[12.5px] leading-relaxed rounded-xl px-3 py-2.5"
        style={{ background: "#fbf6ec", color: "var(--ink-2)", border: "1px solid #ece2d0" }}
      >
        {card.match_reason}
      </p>

      {/* Provenance — the hero element */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-medium flex-shrink-0"
          style={{ background: "#dde6ee", color: "#2f4d63" }}
        >
          <Icon.Users size={12} />
          via {via.peer_name}
        </span>
        <span className="text-[11.5px] text-ink-4">· 2nd degree</span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onAskIntro(card)}
        disabled={drafting}
        className="w-full flex items-center justify-between px-4 h-10 rounded-xl text-[13px] font-medium transition-all duration-150"
        style={{
          background: drafting ? "#ece2d0" : "#b87a4a",
          color: drafting ? "#7a4a25" : "#ffffff",
          opacity: drafting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!drafting) (e.currentTarget as HTMLButtonElement).style.background = "#a06838";
        }}
        onMouseLeave={(e) => {
          if (!drafting) (e.currentTarget as HTMLButtonElement).style.background = "#b87a4a";
        }}
      >
        <span>{drafting ? "Drafting…" : `Ask ${peerFirst} for an intro`}</span>
        {!drafting && <Icon.ArrowRight size={14} />}
      </button>
    </div>
  );
}
