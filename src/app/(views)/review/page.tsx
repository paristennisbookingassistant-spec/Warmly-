"use client";

/**
 * /review — Tinder-style profile review page.
 *
 * Loads contacts with user_action='pending' for the calling user and
 * hands them to SwipeDeck. Empty state if nothing to review.
 *
 * Sorts by relevance_score DESC so the strongest matches surface first.
 * That way the user is most likely to see the contacts they want to
 * save before they get fatigued / give up halfway.
 */

import { useEffect, useState } from "react";
import SwipeDeck from "@/components/review/SwipeDeck";
import Link from "next/link";
import type { Contact } from "@/types/database";

interface ListResponse {
  data?: {
    items?: Contact[];
  };
}

export default function ReviewPage() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(
      "/api/contacts?user_action=pending&sort_by=relevance_score&sort_order=desc&per_page=50",
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((body: ListResponse) => {
        if (cancelled) return;
        setContacts(body.data?.items ?? []);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load review queue");
        setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      {/* Header strip */}
      <div
        className="px-8 pt-6 pb-4"
        style={{ borderBottom: "1px solid var(--line-soft)" }}
      >
        <p
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] mb-1"
          style={{ color: "var(--ink-3)" }}
        >
          Triage
        </p>
        <h1
          className="font-display italic text-[36px] leading-none tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Review new profiles
        </h1>
        <p
          className="text-[13.5px] mt-2 max-w-[640px] leading-relaxed"
          style={{ color: "var(--ink-2)" }}
        >
          One card at a time. Skip the ones that don&rsquo;t fit, save the
          ones to follow up on, or jump straight into drafting outreach.
        </p>
      </div>

      {contacts === null && (
        <div
          className="flex items-center justify-center py-20 font-display italic text-[20px]"
          style={{ color: "var(--ink-3)" }}
        >
          Loading...
        </div>
      )}

      {error && (
        <div
          className="mx-8 mt-6 p-4 rounded-lg"
          style={{
            background: "color-mix(in oklch, #b54339 8%, transparent)",
            border: "1px solid #b54339",
            color: "#b54339",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {contacts !== null && contacts.length > 0 && (
        <SwipeDeck contacts={contacts} />
      )}

      {contacts !== null && contacts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[420px] px-6 text-center">
          <div
            className="font-display italic text-[44px] leading-none tracking-tight mb-3"
            style={{ color: "var(--accent)" }}
          >
            Nothing to review.
          </div>
          <p
            className="text-[14px] max-w-[420px] leading-relaxed mb-6"
            style={{ color: "var(--ink-2)" }}
          >
            New profiles show up here after discovery runs. Use the Warmly
            Chrome extension on a LinkedIn search to populate the queue.
          </p>
          <Link
            href="/contacts"
            className="px-5 py-2.5 rounded-lg text-[13px] font-medium"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            Go to contacts →
          </Link>
        </div>
      )}
    </div>
  );
}
