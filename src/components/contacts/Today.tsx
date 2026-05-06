"use client";

/**
 * Today — daily curated feed of 3 contacts that need attention right now.
 *
 * The signature feature of the Warmly contacts view. Turns a passive directory
 * into an active to-do by surfacing one contact per intent:
 *   - Re-warm: ongoing/met relationship that's gone stale (>30d since last touch)
 *   - Follow-up: contacted >14d ago, no response yet
 *   - Reach out: tier-1 contact never contacted (highest-value cold outreach)
 *
 * If a category has no candidate, that card shows a friendly empty state.
 *
 * Reference: docs/design/v2/project/src/directory.jsx (Today section)
 */

import { useMemo } from "react";
import type { Contact } from "@/types/database";
import Avatar from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";

interface TodayProps {
  contacts: Contact[];
  onOpenContact: (contact: Contact) => void;
}

interface TodaySlot {
  intent: "rewarm" | "followup" | "reachout";
  label: string;
  hint: string;
  contact: Contact | null;
  reason: string | null;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/**
 * Pick the 3 most actionable contacts for today, one per intent slot.
 * Each contact can only fill one slot. Ordering inside each slot:
 * by oldest-staleness (rewarm), oldest-pending (followup), highest-tier (reachout).
 */
export function selectTodayContacts(contacts: Contact[]): TodaySlot[] {
  const taken = new Set<string>();

  // Re-warm: status in (met, ongoing) AND last_interaction_at > 30d ago
  const rewarmCandidate = contacts
    .filter((c) => {
      if (c.status !== "met" && c.status !== "ongoing") return false;
      const days = daysSince(c.last_interaction_at);
      return days != null && days > 30;
    })
    .sort((a, b) => {
      const da = daysSince(a.last_interaction_at) ?? 0;
      const db = daysSince(b.last_interaction_at) ?? 0;
      return db - da;
    })[0];
  if (rewarmCandidate) taken.add(rewarmCandidate.id);

  // Follow-up: status = contacted AND last_interaction_at > 14d ago
  const followupCandidate = contacts
    .filter((c) => {
      if (taken.has(c.id)) return false;
      if (c.status !== "contacted") return false;
      const days = daysSince(c.last_interaction_at);
      return days != null && days > 14;
    })
    .sort((a, b) => {
      const da = daysSince(a.last_interaction_at) ?? 0;
      const db = daysSince(b.last_interaction_at) ?? 0;
      return db - da;
    })[0];
  if (followupCandidate) taken.add(followupCandidate.id);

  // Reach-out: tier 1, status = discovered (never contacted)
  const reachoutCandidate = contacts
    .filter((c) => {
      if (taken.has(c.id)) return false;
      if (c.status !== "discovered") return false;
      return c.tier === 1;
    })
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))[0];
  if (reachoutCandidate) taken.add(reachoutCandidate.id);

  return [
    {
      intent: "rewarm",
      label: "Re-warm",
      hint: "A relationship going cold",
      contact: rewarmCandidate ?? null,
      reason: rewarmCandidate
        ? `Last touch ${daysSince(rewarmCandidate.last_interaction_at)} days ago — keep the thread alive.`
        : null,
    },
    {
      intent: "followup",
      label: "Follow up",
      hint: "Outreach still pending reply",
      contact: followupCandidate ?? null,
      reason: followupCandidate
        ? `Reached out ${daysSince(followupCandidate.last_interaction_at)} days ago — gentle nudge time.`
        : null,
    },
    {
      intent: "reachout",
      label: "Reach out",
      hint: "Highest-value cold contact",
      contact: reachoutCandidate ?? null,
      reason: reachoutCandidate?.suggested_hook
        ? reachoutCandidate.suggested_hook
        : reachoutCandidate?.recommendation_reason ??
          "A strong tier-A match worth a thoughtful first message.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TodayCard({
  slot,
  onOpenContact,
}: {
  slot: TodaySlot;
  onOpenContact: (contact: Contact) => void;
}) {
  if (!slot.contact) {
    return (
      <div
        className="rounded-lg p-5"
        style={{
          background: "var(--bg-sunk)",
          border: "1px dashed var(--line)",
        }}
      >
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium mb-2">
          {slot.label}
        </div>
        <p className="text-[13px] text-ink-3 leading-relaxed">
          Nothing waiting in this lane today. {slot.hint.toLowerCase()}.
        </p>
      </div>
    );
  }

  const c = slot.contact;
  return (
    <button
      onClick={() => onOpenContact(c)}
      className="w-full text-left rounded-lg p-5 transition-all duration-150 hover:-translate-y-px relative overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* Accent left-bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: "var(--accent)" }}
      />

      <div className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-ink-3 mb-3">
        {slot.label}
      </div>

      <div className="flex items-start gap-3">
        <Avatar
          name={c.name}
          src={c.avatar_url ?? null}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-ink leading-snug truncate">
            {c.name}
          </div>
          {(c.current_title || c.company) && (
            <p className="text-[12.5px] text-ink-2 mt-0.5 truncate">
              {c.current_title}
              {c.current_title && c.company ? " · " : ""}
              {c.company}
            </p>
          )}
        </div>
      </div>

      {slot.reason && (
        <p className="mt-3 text-[12.5px] text-ink-3 leading-relaxed line-clamp-3">
          {slot.reason}
        </p>
      )}

      <div className="mt-3 text-[11.5px] font-medium text-accent-ink opacity-80">
        Open profile ↗
      </div>

      {c.last_interaction_at && (
        <div className="mt-2 text-[10.5px] text-ink-4">
          Last contact {formatRelativeTime(c.last_interaction_at)}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Today({ contacts, onOpenContact }: TodayProps) {
  const slots = useMemo(() => selectTodayContacts(contacts), [contacts]);

  // Hide entire section if nothing to show in any lane
  const allEmpty = slots.every((s) => s.contact === null);
  if (allEmpty && contacts.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p
          className="text-[10.5px] uppercase tracking-[0.12em] font-medium"
          style={{ color: "var(--ink-3)" }}
        >
          Today · coach&rsquo;s focus
        </p>
        <h2 className="font-display italic text-[24px] text-ink leading-tight tracking-tight mt-1">
          Three people worth your attention right now.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <TodayCard
            key={slot.intent}
            slot={slot}
            onOpenContact={onOpenContact}
          />
        ))}
      </div>
    </section>
  );
}
