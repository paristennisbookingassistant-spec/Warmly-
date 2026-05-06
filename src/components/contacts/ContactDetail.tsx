"use client";

/**
 * ContactDetail — 2-column layout per Warmly design refresh.
 *
 * Left column (scrollable): hero, prominent hook block, stage track,
 *                            career timeline, education timeline, artifacts list.
 * Right sidebar (scrollable): coach's take, next steps, why-this-match bullets,
 *                              tags, scoring breakdown (toggleable).
 *
 * Reference: docs/design/v2/project/src/detail.jsx
 */

import { useMemo, useState } from "react";
import type { Contact, Artifact, User } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import ArtifactCard from "@/components/chat/ArtifactCard";
import ArtifactDrawer from "@/components/chat/ArtifactDrawer";
import { formatRelativeTime } from "@/lib/utils";
import {
  buildMatchSignals,
  getRelationshipHealthFromDate,
  type RelationshipHealth,
} from "@/lib/utils/matchSignals";

interface ContactDetailProps {
  contact: Contact;
  artifacts: Artifact[];
  /** Optional — supplies the user profile so we can compute richer match signals. */
  currentUser?: Pick<User, "career_history" | "education"> | null;
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
  connection_note: "Connection notes",
  outreach_draft: "Outreach drafts",
  meeting_prep: "Meeting prep",
  meeting_notes: "Meeting notes",
  action_plan: "Action plans",
  follow_up_draft: "Follow-up drafts",
};

const TIER_LABEL: Record<number, string> = {
  1: "Tier A",
  2: "Tier B",
  3: "Tier C",
};

const HEALTH_TEXT: Record<RelationshipHealth, string> = {
  green: "Warm",
  yellow: "Cooling",
  red: "Cold",
  gray: "Not contacted",
};

const HEALTH_COLOR: Record<RelationshipHealth, string> = {
  green: "var(--good)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  gray: "var(--mute)",
};

function groupArtifactsByType(artifacts: Artifact[]) {
  return artifacts.reduce<Record<string, Artifact[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SideBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 rounded-lg" style={{ background: "var(--bg-sunk)" }}>
      <h4 className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-ink-3 mb-2.5">
        {label}
      </h4>
      <div className="text-ink-2">{children}</div>
    </div>
  );
}

function StageTrack({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGE_ORDER.indexOf(
    currentStage as (typeof STAGE_ORDER)[number]
  );
  return (
    <div className="grid grid-cols-5 gap-1 relative">
      {STAGE_ORDER.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div
            key={stage}
            className="flex flex-col items-center text-center relative"
          >
            {/* Connector line — drawn from this dot to the next */}
            {idx < STAGE_ORDER.length - 1 && (
              <div
                className="absolute top-2 left-1/2 w-full h-px"
                style={{
                  background: isDone ? "var(--accent)" : "var(--line)",
                }}
              />
            )}
            {/* Dot */}
            <div
              className="w-4 h-4 rounded-full z-10 transition-colors"
              style={{
                background: isCurrent
                  ? "var(--accent)"
                  : isDone
                  ? "var(--accent)"
                  : "var(--surface)",
                border: isCurrent
                  ? "3px solid var(--accent-soft)"
                  : isDone
                  ? "1px solid var(--accent)"
                  : "1px solid var(--line)",
              }}
            />
            <span
              className="mt-2 text-[10.5px] font-medium uppercase tracking-wider"
              style={{
                color: isCurrent
                  ? "var(--ink)"
                  : isDone
                  ? "var(--ink-2)"
                  : "var(--ink-4)",
              }}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Timeline<T>({
  items,
  renderItem,
  expandable = true,
}: {
  items: T[];
  renderItem: (item: T, isCurrent: boolean) => React.ReactNode;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 1);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="relative pl-5">
        {/* Vertical line */}
        <div
          className="absolute left-1 top-1 bottom-1 w-px"
          style={{ background: "var(--line)" }}
        />
        <div className="space-y-4">
          {shown.map((item, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div
                className="absolute -left-[18px] top-1.5 w-2 h-2 rounded-full"
                style={{
                  background: i === 0 ? "var(--accent)" : "var(--ink-4)",
                  boxShadow:
                    i === 0
                      ? "0 0 0 3px var(--accent-soft)"
                      : "0 0 0 2px var(--bg)",
                }}
              />
              {renderItem(item, i === 0)}
            </div>
          ))}
        </div>
      </div>
      {expandable && items.length > 1 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-[12px] text-ink-3 hover:text-ink transition-colors flex items-center gap-1"
        >
          {expanded ? "Show latest only" : `Show ${items.length - 1} more`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ContactDetail({
  contact,
  artifacts,
  currentUser,
  onOpenSession,
}: ContactDetailProps) {
  const [openArtifact, setOpenArtifact] = useState<Artifact | null>(null);
  const [showScoringDetail, setShowScoringDetail] = useState(false);
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const groupedArtifacts = useMemo(
    () => groupArtifactsByType(artifacts),
    [artifacts]
  );
  const matchSignals = useMemo(
    () => buildMatchSignals({ contact, user: currentUser ?? null }),
    [contact, currentUser]
  );
  const health = getRelationshipHealthFromDate(contact.last_interaction_at);
  const tier = contact.tier;

  async function handleNotesBlur() {
    if (notes === (contact.notes ?? "")) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
      }
    } finally {
      setIsSavingNotes(false);
    }
  }

  return (
    <div
      className="grid h-full overflow-hidden"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
    >
      {/* LEFT — main content */}
      <div className="overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-7 pb-12">
          {/* Hero */}
          <header className="flex items-start gap-5">
            <Avatar
              name={contact.name}
              src={contact.avatar_url ?? null}
              size="xl"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-display italic text-[34px] leading-tight text-ink tracking-tight">
                {contact.name}
              </h1>
              {(contact.current_title || contact.company) && (
                <p className="text-[15px] text-ink-2 mt-1">
                  {contact.current_title}
                  {contact.current_title && contact.company && (
                    <span className="text-ink-3"> at </span>
                  )}
                  {contact.company}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[12.5px] text-ink-3">
                {contact.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    {contact.location}
                  </span>
                )}
                {contact.linkedin_url && (
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: HEALTH_COLOR[health] }}
                  />
                  {HEALTH_TEXT[health]}
                  {contact.last_interaction_at &&
                    ` · last touch ${formatRelativeTime(contact.last_interaction_at)}`}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={() => onOpenSession?.(contact)}
                className="px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors text-bg"
                style={{ background: "var(--ink)" }}
              >
                Open session
              </button>
              {tier && (
                <span
                  className="text-[10.5px] uppercase tracking-[0.12em] font-medium"
                  style={{ color: "var(--ink-3)" }}
                >
                  {TIER_LABEL[tier]}
                  {contact.relevance_score != null &&
                    ` · ${Math.round(contact.relevance_score * 10)}/100`}
                </span>
              )}
            </div>
          </header>

          {/* Hook block — the signature pattern */}
          {contact.suggested_hook && (
            <div className="hook-block">
              <div className="hook-block__label">
                Why this person · why now
              </div>
              <div className="hook-block__body">
                &ldquo;{contact.suggested_hook}&rdquo;
              </div>
            </div>
          )}

          {/* Stage track */}
          <section>
            <h3 className="text-[13px] font-semibold text-ink mb-4">
              Relationship · {STAGE_LABELS[contact.status]}
            </h3>
            <StageTrack currentStage={contact.status} />
          </section>

          {/* Career timeline */}
          {(contact.career_history?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-ink mb-4">
                Career path
              </h3>
              <Timeline
                items={contact.career_history ?? []}
                renderItem={(role) => (
                  <div>
                    <div className="text-[14px] font-medium text-ink leading-snug">
                      {role.title}
                    </div>
                    <div className="text-[12.5px] text-ink-2 mt-0.5">
                      {role.company}
                    </div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">
                      {role.start_date}
                      {role.end_date === null
                        ? " — Present"
                        : role.end_date
                        ? ` — ${role.end_date}`
                        : ""}
                    </div>
                    {role.description && (
                      <p className="text-[12px] text-ink-3 mt-1.5 line-clamp-2">
                        {role.description}
                      </p>
                    )}
                  </div>
                )}
              />
            </section>
          )}

          {/* Education timeline */}
          {(contact.education?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-ink mb-4">
                Education
              </h3>
              <Timeline
                items={contact.education ?? []}
                renderItem={(edu) => (
                  <div>
                    <div className="text-[14px] font-medium text-ink leading-snug">
                      {edu.school}
                    </div>
                    <div className="text-[12.5px] text-ink-2 mt-0.5">
                      {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                    </div>
                    {edu.year && (
                      <div className="text-[11.5px] text-ink-3 mt-0.5">
                        {edu.year}
                      </div>
                    )}
                  </div>
                )}
              />
            </section>
          )}

          {/* Artifacts */}
          {Object.keys(groupedArtifacts).length > 0 && (
            <section>
              <h3 className="text-[13px] font-semibold text-ink mb-4">
                Artifacts · produced by the coach
              </h3>
              <div className="space-y-5">
                {Object.entries(groupedArtifacts).map(
                  ([type, typeArtifacts]) => (
                    <div key={type}>
                      <p className="text-[10.5px] uppercase tracking-[0.12em] text-ink-4 font-medium mb-2">
                        {TYPE_LABELS[type] ?? type}
                      </p>
                      <div className="space-y-2">
                        {typeArtifacts.map((artifact) => (
                          <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            onOpen={setOpenArtifact}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-ink">My notes</h3>
              {noteSaved && (
                <span
                  className="text-[11px] font-medium animate-fade-in"
                  style={{ color: "var(--good)" }}
                >
                  Saved
                </span>
              )}
              {isSavingNotes && !noteSaved && (
                <span className="text-[11px] text-ink-4">Saving…</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add personal notes about this contact…"
              rows={4}
              className="w-full text-[14px] text-ink leading-relaxed rounded-lg px-4 py-3 resize-none focus:outline-none transition-colors placeholder:text-ink-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            />
            <p className="text-[11px] text-ink-4 mt-1.5">
              Notes auto-save when you click away
            </p>
          </section>
        </div>
      </div>

      {/* RIGHT — coach sidebar */}
      <aside
        className="overflow-y-auto py-8 px-5 space-y-3"
        style={{
          borderLeft: "1px solid var(--line-soft)",
          background: "var(--bg)",
        }}
      >
        {/* Coach's take */}
        {contact.recommendation_reason && (
          <SideBlock label="Coach's take">
            <p className="font-display italic text-[15px] leading-relaxed text-ink">
              {contact.recommendation_reason}
            </p>
          </SideBlock>
        )}

        {/* Why this match */}
        {matchSignals.length > 0 && (
          <SideBlock label="Why this match">
            <ul className="space-y-2">
              {matchSignals.map((s, i) => (
                <li
                  key={i}
                  className="text-[13px] leading-relaxed flex gap-2"
                >
                  <span
                    className="inline-block w-1 h-1 rounded-full mt-2 flex-shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  <span className="text-ink-2">{s}</span>
                </li>
              ))}
            </ul>
          </SideBlock>
        )}

        {/* Scoring breakdown — collapsed by default */}
        {contact.scoring_breakdown && contact.relevance_score != null && (
          <SideBlock label="Relevance score">
            <div className="flex items-center justify-between mb-1">
              <span className="font-display italic text-[28px] text-ink leading-none">
                {Math.round(contact.relevance_score * 10)}
              </span>
              <button
                onClick={() => setShowScoringDetail((v) => !v)}
                className="text-[11px] text-ink-3 hover:text-ink transition-colors"
              >
                {showScoringDetail ? "Hide details" : "View details"}
              </button>
            </div>
            {showScoringDetail && (
              <div className="space-y-2 mt-3">
                {Object.entries(contact.scoring_breakdown).map(
                  ([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-ink-3 capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span
                          className="font-mono text-ink-2"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {(value as number).toFixed(1)}
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ background: "var(--line-soft)" }}
                      >
                        <div
                          className="h-full progress-fill rounded-full"
                          style={{
                            background: "var(--accent)",
                            width: `${Math.min(100, ((value as number) / 10) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </SideBlock>
        )}

        {/* Discovery metadata */}
        <SideBlock label="Discovered">
          <p className="text-[12.5px] text-ink-2">
            Added {formatRelativeTime(contact.discovered_at)}
          </p>
          {contact.last_interaction_at && (
            <p className="text-[12.5px] text-ink-3 mt-0.5">
              Last interaction {formatRelativeTime(contact.last_interaction_at)}
            </p>
          )}
        </SideBlock>
      </aside>

      {/* Artifact drawer — shared across in-card opens */}
      <ArtifactDrawer
        artifact={openArtifact}
        onClose={() => setOpenArtifact(null)}
        onUpdated={(updated) => {
          // Merge into local artifacts list display by re-finding
          setOpenArtifact(updated);
        }}
      />
    </div>
  );
}
