"use client";

/**
 * ContactList — dense table view of all contacts.
 *
 * The default layout per Warmly design. Reference:
 * docs/design/v2/project/src/directory.jsx (DirectoryTable component).
 *
 * Each row: avatar + name+location · role+company · stage pill · context tags
 * (derived from career/education) · last contact · fit score+tier.
 *
 * Click a row → contact detail. Header columns sort the list (relevance,
 * recency, name, company).
 */

import { useMemo, useState } from "react";
import type { Contact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  getRelationshipHealthFromDate,
  type RelationshipHealth,
} from "@/lib/utils/matchSignals";

interface ContactListProps {
  contacts: Contact[];
  isLoading?: boolean;
  onOpenContact: (contact: Contact) => void;
}

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  contacted: "Contacted",
  connected: "Connected",
  met: "Met",
  ongoing: "Ongoing",
};

const HEALTH_COLOR: Record<RelationshipHealth, string> = {
  green: "var(--good)",
  yellow: "var(--warn)",
  red: "var(--bad)",
  gray: "var(--mute)",
};

type SortKey = "relevance" | "recency" | "name" | "company";

const COLUMNS: Array<{
  key: string;
  label: string;
  sort: SortKey | null;
  className?: string;
}> = [
  { key: "name", label: "Name", sort: "name" },
  { key: "role", label: "Role · Company", sort: "company" },
  { key: "stage", label: "Stage", sort: null },
  { key: "context", label: "Context", sort: null },
  { key: "last", label: "Last contact", sort: "recency" },
  { key: "score", label: "Fit", sort: "relevance" },
];

/**
 * Pick up to 2 short context labels from a contact's career history + education.
 * These stand in for `tags` (which we don't yet store on the contacts table).
 */
function deriveContextTags(contact: Contact): string[] {
  const tags: string[] = [];

  // Most recent prior employer (skip the current company)
  const priorRoles = contact.career_history.slice(1, 3);
  for (const role of priorRoles) {
    if (!role.company) continue;
    if (role.company === contact.company) continue;
    const short = role.company.length > 18 ? role.company.slice(0, 16) + "…" : role.company;
    tags.push(`ex-${short}`);
    if (tags.length >= 1) break;
  }

  // Most recent education
  const edu = contact.education[0];
  if (edu?.school) {
    const yr = edu.year ? ` '${String(edu.year).slice(-2)}` : "";
    tags.push(`${edu.school}${yr}`);
  }

  return tags.slice(0, 2);
}

function sortContacts(contacts: Contact[], sort: SortKey): Contact[] {
  const list = [...contacts];
  switch (sort) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "company":
      return list.sort((a, b) =>
        (a.company ?? "").localeCompare(b.company ?? "")
      );
    case "recency":
      return list.sort((a, b) => {
        const ta = a.last_interaction_at
          ? new Date(a.last_interaction_at).getTime()
          : 0;
        const tb = b.last_interaction_at
          ? new Date(b.last_interaction_at).getTime()
          : 0;
        return tb - ta;
      });
    case "relevance":
    default:
      return list.sort(
        (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
      );
  }
}

export default function ContactList({
  contacts,
  isLoading = false,
  onOpenContact,
}: ContactListProps) {
  const [sort, setSort] = useState<SortKey>("relevance");
  const sorted = useMemo(() => sortContacts(contacts, sort), [contacts, sort]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-md skeleton-pulse"
            style={{ background: "var(--surface-2)" }}
          />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        className="rounded-lg p-10 text-center"
        style={{
          background: "var(--bg-sunk)",
          border: "1px dashed var(--line)",
        }}
      >
        <p
          className="font-display italic text-[20px]"
          style={{ color: "var(--ink-2)" }}
        >
          Nobody here yet.
        </p>
        <p
          className="text-[13px] mt-2"
          style={{ color: "var(--ink-3)" }}
        >
          Add a contact above, or run a discovery session to fill your network.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-[11px] uppercase tracking-[0.12em] font-medium mb-3"
        style={{ color: "var(--ink-4)" }}
      >
        {sorted.length} {sorted.length === 1 ? "contact" : "contacts"}
      </div>

      {/* Header row */}
      <div
        className="grid items-center px-3 py-2.5 text-[10.5px] uppercase tracking-[0.1em] font-medium"
        style={{
          gridTemplateColumns: "minmax(180px, 1.5fr) minmax(180px, 1.5fr) 110px minmax(140px, 1fr) 100px 100px",
          color: "var(--ink-3)",
          borderBottom: "1px solid var(--line)",
        }}
        role="row"
      >
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            role="columnheader"
            onClick={() => col.sort && setSort(col.sort)}
            disabled={!col.sort}
            className={cn(
              "text-left transition-colors",
              col.sort ? "hover:text-ink cursor-pointer" : "cursor-default"
            )}
            style={{
              color: sort === col.sort ? "var(--ink)" : undefined,
            }}
          >
            {col.label}
            {col.sort && (
              <span className="ml-1 opacity-50 text-[9px]">↕</span>
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
        {sorted.map((c) => {
          const tags = deriveContextTags(c);
          const health = getRelationshipHealthFromDate(c.last_interaction_at);
          return (
            <button
              key={c.id}
              onClick={() => onOpenContact(c)}
              className="w-full text-left grid items-center px-3 py-3 transition-colors hover:bg-surface-2"
              style={{
                gridTemplateColumns:
                  "minmax(180px, 1.5fr) minmax(180px, 1.5fr) 110px minmax(140px, 1fr) 100px 100px",
                borderTop: "1px solid var(--line-soft)",
              }}
              role="row"
            >
              {/* Name + location */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={c.name}
                  src={c.avatar_url ?? null}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">
                    {c.name}
                  </div>
                  {c.location && (
                    <div
                      className="text-[11px] truncate"
                      style={{ color: "var(--ink-4)" }}
                    >
                      {c.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Role + company */}
              <div className="min-w-0 pr-3">
                <div className="text-[13px] text-ink-2 truncate">
                  {c.current_title ?? "—"}
                </div>
                <div
                  className="text-[11.5px] truncate"
                  style={{ color: "var(--ink-3)" }}
                >
                  {c.company ?? ""}
                </div>
              </div>

              {/* Stage pill */}
              <div className="min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--ink-2)",
                    boxShadow: "inset 0 0 0 1px var(--line-soft)",
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: HEALTH_COLOR[health] }}
                  />
                  {STAGE_LABELS[c.status] ?? c.status}
                </span>
              </div>

              {/* Context tags */}
              <div className="flex items-center gap-1 flex-wrap min-w-0 pr-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px]"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink-3)",
                      boxShadow: "inset 0 0 0 1px var(--line-soft)",
                    }}
                  >
                    {t}
                  </span>
                ))}
                {tags.length === 0 && (
                  <span
                    className="text-[10.5px]"
                    style={{ color: "var(--ink-4)" }}
                  >
                    —
                  </span>
                )}
              </div>

              {/* Last contact */}
              <div
                className="font-mono text-[11px] tabular-nums truncate"
                style={{ color: "var(--ink-3)" }}
              >
                {c.last_interaction_at
                  ? formatRelativeTime(c.last_interaction_at)
                  : "—"}
              </div>

              {/* Fit score */}
              <div className="font-mono text-[12px] tabular-nums">
                {c.relevance_score != null ? (
                  <span style={{ color: "var(--ink)" }}>
                    {c.relevance_score.toFixed(1)}
                    {c.tier && (
                      <span
                        className="ml-1 text-[10.5px]"
                        style={{ color: "var(--ink-4)" }}
                      >
                        · T{c.tier}
                      </span>
                    )}
                  </span>
                ) : (
                  <span style={{ color: "var(--ink-4)" }}>—</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
