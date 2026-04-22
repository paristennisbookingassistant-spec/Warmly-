"use client";

import { useState } from "react";
import type { Contact, Artifact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ArtifactCard from "@/components/chat/ArtifactCard";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ContactDetailProps {
  contact: Contact;
  artifacts: Artifact[];
  onOpenSession?: (contact: Contact) => void;
}

const STAGE_ORDER = [
  "discovered",
  "contacted",
  "connected",
  "met",
  "ongoing",
] as const;

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  contacted: "Contacted",
  connected: "Connected",
  met: "Met",
  ongoing: "Ongoing",
};

const TYPE_LABELS: Record<string, string> = {
  connection_note: "Connection Notes",
  outreach_draft: "Outreach Drafts",
  meeting_prep: "Meeting Prep",
  meeting_notes: "Meeting Notes",
  action_plan: "Action Plans",
  follow_up_draft: "Follow-up Drafts",
};

const TIER_CONFIG: Record<
  number,
  { label: string; bg: string; text: string; border: string }
> = {
  1: {
    label: "Tier A",
    bg: "bg-[#f0fdf4]",
    text: "text-[#15803d]",
    border: "border-black/[0.06]",
  },
  2: {
    label: "Tier B",
    bg: "bg-[#f0f9ff]",
    text: "text-[#0369a1]",
    border: "border-black/[0.06]",
  },
  3: {
    label: "Tier C",
    bg: "bg-[#fffbeb]",
    text: "text-[#b45309]",
    border: "border-black/[0.06]",
  },
};

function groupArtifactsByType(artifacts: Artifact[]) {
  return artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {});
}

function ScoreBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#525252]">{label}</span>
        <span className="font-semibold text-[#171717]">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#171717] rounded-full progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ContactDetail({
  contact,
  artifacts,
  onOpenSession,
}: ContactDetailProps) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  const groupedArtifacts = groupArtifactsByType(artifacts);
  const tier = contact.tier;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;
  const currentStageIdx = STAGE_ORDER.indexOf(
    contact.status as (typeof STAGE_ORDER)[number]
  );

  function handleNotesBlur() {
    // TODO: PATCH /api/contacts/:id with updated notes
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8 animate-fade-in">
      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)" }}>
        {/* Tier color bar */}
        {tier && (
          <div
            className={cn(
              "h-1",
              tier === 1 && "bg-emerald-400",
              tier === 2 && "bg-blue-400",
              tier === 3 && "bg-amber-400"
            )}
          />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar name={contact.name} src={contact.avatar_url ?? null} size="xl" />
              <div>
                <h1 className="text-xl font-semibold text-[#171717] tracking-tight">
                  {contact.name}
                </h1>
                {(contact.current_title || contact.company) && (
                  <p className="text-sm text-[#525252] mt-0.5">
                    {[contact.current_title, contact.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                )}
                {contact.location && (
                  <p className="text-xs text-[#a3a3a3] mt-0.5 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
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
                    </svg>
                    {contact.location}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="default">{STAGE_LABELS[contact.status]}</Badge>
                  {tierCfg && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        tierCfg.bg,
                        tierCfg.text,
                        tierCfg.border
                      )}
                    >
                      {tierCfg.label}
                    </span>
                  )}
                  {contact.relevance_score !== null && (
                    <span className="text-xs font-mono font-bold text-[#525252]">
                      Score {Math.round(contact.relevance_score * 10)}/100
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={() => onOpenSession?.(contact)}
                className="px-4 py-2 bg-[#171717] text-white text-sm font-medium rounded-full hover:bg-[#2a2a2a] active:scale-95 transition-all"
              >
                Open chat
              </button>
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#525252] hover:text-[#171717] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Coaching insights */}
          {(contact.recommendation_reason || contact.suggested_hook) && (
            <div className="mt-5 grid gap-3">
              {contact.recommendation_reason && (
                <div className="bg-black/[0.02] rounded-xl px-4 py-3 border border-black/[0.06]">
                  <p className="text-xs font-semibold text-[#525252] mb-1">
                    Why this contact matters
                  </p>
                  <p className="text-sm text-[#171717] leading-relaxed">
                    {contact.recommendation_reason}
                  </p>
                </div>
              )}
              {contact.suggested_hook && (
                <div className="bg-black/[0.02] rounded-xl px-4 py-3 border border-black/[0.06]">
                  <p className="text-xs font-semibold text-[#525252] mb-1">
                    Suggested outreach hook
                  </p>
                  <p className="text-sm text-[#171717] leading-relaxed">
                    {contact.suggested_hook}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scoring breakdown */}
      {contact.scoring_breakdown && contact.relevance_score !== null && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#171717]">
              Relevance Score
            </h2>
            <span className="text-3xl font-bold text-[#171717] font-mono">
              {Math.round(contact.relevance_score * 10)}
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(contact.scoring_breakdown).map(([key, value]) => (
              <ScoreBar
                key={key}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                value={value as number}
              />
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {contact.career_history.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="text-sm font-semibold text-[#171717] mb-4">Experience</h2>
          <div className="space-y-4">
            {contact.career_history.map((role, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#171717] leading-snug">{role.title}</p>
                  <p className="text-xs text-[#525252] mt-0.5">
                    {[role.company, role.end_date === null ? "Present" : role.end_date ? role.start_date + " – " + role.end_date : role.start_date].filter(Boolean).join(" · ")}
                  </p>
                  {role.description && (
                    <p className="text-xs text-[#a3a3a3] mt-1 line-clamp-2">{role.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {contact.education.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="text-sm font-semibold text-[#171717] mb-4">Education</h2>
          <div className="space-y-4">
            {contact.education.map((edu, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#171717] leading-snug">{edu.school}</p>
                  <p className="text-xs text-[#525252] mt-0.5">
                    {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                    {edu.year && <span className="text-[#a3a3a3]"> · {edu.year}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationship timeline */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <h2 className="text-sm font-semibold text-[#171717] mb-4">
          Relationship Progress
        </h2>
        <div className="relative flex items-center justify-between">
          {STAGE_ORDER.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isActive = idx === currentStageIdx;
            return (
              <div
                key={stage}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Connector line */}
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-3 left-1/2 w-full h-0.5",
                      isCompleted ? "bg-[#171717]" : "bg-black/[0.06]"
                    )}
                  />
                )}
                {/* Dot */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white",
                    isActive
                      ? "border-[#171717] bg-[#171717]"
                      : isCompleted
                      ? "border-[#525252] bg-[#525252]"
                      : "border-black/[0.1] bg-white"
                  )}
                >
                  {(isCompleted || isActive) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1.5 font-medium",
                    isActive
                      ? "text-[#171717]"
                      : isCompleted
                      ? "text-[#525252]"
                      : "text-[#a3a3a3]"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[#a3a3a3] mt-4">
          Added {formatRelativeTime(contact.discovered_at)}
          {contact.last_interaction_at &&
            ` · Last interaction ${formatRelativeTime(contact.last_interaction_at)}`}
        </p>
      </div>

      {/* Artifacts */}
      {Object.keys(groupedArtifacts).length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="text-sm font-semibold text-[#171717] mb-4">
            Artifacts ({artifacts.length})
          </h2>
          <div className="space-y-5">
            {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
              <div key={type}>
                <p className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wider mb-2.5">
                  {TYPE_LABELS[type] ?? type}
                </p>
                <div className="space-y-2">
                  {typeArtifacts.map((artifact) => (
                    <ArtifactCard key={artifact.id} artifact={artifact} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#171717]">My Notes</h2>
          {noteSaved && (
            <span className="text-xs text-green-600 font-medium animate-fade-in">
              Saved
            </span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add your personal notes about this contact..."
          rows={4}
          className="w-full text-sm text-[#171717] leading-relaxed bg-white border border-black/[0.1] rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-black/[0.04] focus:border-black/[0.2] transition-all placeholder:text-[#a3a3a3]"
        />
        <p className="text-xs text-[#a3a3a3] mt-1.5">
          Notes auto-save when you click away
        </p>
      </div>
    </div>
  );
}
