"use client";

/**
 * components/v2/discover/DiscoverScreen.tsx
 * Top-level state machine for the Discover experience.
 * States: doors | cv-tinder | linkedin-setup | linkedin-tinder
 *
 * - INSEAD door uses seed deck only (no persistence — save toasts).
 * - LinkedIn door fetches LIVE pending contacts from /api/contacts.
 * - Save/Skip on LinkedIn deck persists via PATCH /api/contacts/{id}/review.
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../Toast";
import { tierLabelFromNumber } from "../palette";
import { DoorsView } from "./Doors";
import { TinderView } from "./TinderView";
import { LinkedInSetup } from "./LinkedInSetup";
import { CV_DECK, LINKEDIN_DEMO_DECK } from "./seed";
import type { DeckCard } from "./types";
import type { Contact, LinkedInExperienceEntry, LinkedInEducationEntry } from "@/types/database";

// ---------- API response shape ----------

interface ContactsApiResponse {
  data: {
    items: Contact[];
    total: number;
    has_more: boolean;
  };
}

// ---------- Contact → DeckCard mapping ----------

function expBullet(exp: LinkedInExperienceEntry): string {
  const parts: string[] = [`${exp.title} @ ${exp.company}`];
  if (exp.dateRange.start) {
    const end = exp.dateRange.end ?? "present";
    parts.push(`${exp.dateRange.start}–${end}`);
  }
  return parts.join(", ");
}

function eduBullet(edu: LinkedInEducationEntry): string {
  const parts: string[] = [edu.school];
  if (edu.degree) parts.push(edu.degree);
  if (edu.dateRange.start) parts.push(edu.dateRange.start);
  return parts.join(" · ");
}

function inseadShortFromEdu(entries: LinkedInEducationEntry[]): string | null {
  const entry = entries.find((e) => /insead/i.test(e.school));
  if (!entry) return null;
  // Derive "22D", "24J" etc. from dateRange.start like "2022" and degree like "MBA 22D"
  if (entry.degree) {
    const m = entry.degree.match(/(\d{2}[DJ])/i);
    if (m) return m[1].toUpperCase();
  }
  // Fallback: just return "INSEAD"
  return "INSEAD";
}

function contactToDeckCard(c: Contact): DeckCard {
  const expBullets: string[] = (c.experience ?? [])
    .slice(0, 2)
    .map(expBullet);

  const latestEdu = (c.education_v2 ?? [])[0];
  const eduBullets: string[] = latestEdu ? [eduBullet(latestEdu)] : [];

  const about = [...expBullets, ...eduBullets].slice(0, 3);
  const inseadShort = c.education_v2 ? inseadShortFromEdu(c.education_v2) : null;

  return {
    id: c.id,
    name: c.name,
    role: c.current_title ?? null,
    company: c.company ?? null,
    location: c.location ?? null,
    avatar: c.photo_url ?? c.avatar_url ?? null,
    linkedinUrl: c.linkedin_url ?? null,
    tier: c.tier != null ? tierLabelFromNumber(c.tier) : null,
    rationale: c.recommendation_reason ?? c.linkedin_bio ?? null,
    about,
    inseadShort,
    channel: "linkedin",
  };
}

// ---------- DiscoverScreen ----------

type View = "doors" | "cv-tinder" | "linkedin-setup" | "linkedin-tinder";

export function DiscoverScreen() {
  const toast = useToast();
  const [view, setView] = useState<View>("doors");

  // LinkedIn live deck state
  const [liveDeck, setLiveDeck] = useState<DeckCard[]>([]);
  const [livePendingTotal, setLivePendingTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  // Fetch pending contacts on mount to determine if LinkedIn is connected
  // and populate the live deck.
  const fetchLiveDeck = useCallback(async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch(
        "/api/contacts?user_action=pending&sort_by=relevance_score&sort_order=desc&per_page=25&lite=true",
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ContactsApiResponse;
      const items = json.data?.items ?? [];
      setLivePendingTotal(json.data?.total ?? items.length);
      setLinkedInConnected(items.length > 0);
      setLiveDeck(items.map(contactToDeckCard));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load contacts";
      setLiveError(msg);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveDeck();
  }, [fetchLiveDeck]);

  // Navigation handlers
  const openCV = () => setView("cv-tinder");
  const openLinkedIn = () =>
    setView(linkedInConnected ? "linkedin-tinder" : "linkedin-setup");
  const onSetupDone = () => setView("linkedin-tinder");
  const backToDoors = () => setView("doors");

  // INSEAD deck save — local only (no persistence), show toast
  const handleCvSave = (card: DeckCard) => {
    toast(`${card.name} saved — add to contacts after the INSEAD directory is ingested.`);
  };

  const handleCvSkip = (_card: DeckCard) => {
    // No-op for seed deck
  };

  // LinkedIn deck save → PATCH /api/contacts/{id}/review
  const handleLinkedInSave = async (card: DeckCard) => {
    // Optimistic advance already done in TinderView; fire PATCH in background
    try {
      const res = await fetch(`/api/contacts/${card.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(`${card.name} saved to contacts.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast(`Could not save ${card.name}: ${msg}`);
      // Revert is complex without a full revert mechanism; log for now
      console.error("[DiscoverScreen] save failed:", err);
    }
  };

  const handleLinkedInSkip = async (card: DeckCard) => {
    try {
      const res = await fetch(`/api/contacts/${card.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "skip" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[DiscoverScreen] skip failed:", err);
    }
  };

  // TinderView renders full-width (no outer padding)
  if (view === "cv-tinder") {
    return (
      <TinderView
        channel="cv"
        deck={CV_DECK}
        onBack={backToDoors}
        onSave={handleCvSave}
        onSkip={handleCvSkip}
      />
    );
  }

  if (view === "linkedin-tinder") {
    // While loading show a skeleton, on error show retry
    if (liveLoading) {
      return <LinkedInDeckSkeleton onBack={backToDoors} />;
    }
    if (liveError) {
      return (
        <LinkedInDeckError
          message={liveError}
          onRetry={fetchLiveDeck}
          onBack={backToDoors}
        />
      );
    }
    const deck = liveDeck.length > 0 ? liveDeck : LINKEDIN_DEMO_DECK;
    return (
      <TinderView
        channel="linkedin"
        deck={deck}
        onBack={backToDoors}
        onSave={handleLinkedInSave}
        onSkip={handleLinkedInSkip}
      />
    );
  }

  // Doors + setup views have max-width container
  return (
    <div className="px-10 pt-7 pb-6 max-w-[1280px] mx-auto flex-1 flex flex-col w-full">
      {view === "doors" && (
        <DoorsView
          linkedInConnected={linkedInConnected}
          linkedInPendingCount={livePendingTotal}
          onOpenCV={openCV}
          onOpenLinkedIn={openLinkedIn}
        />
      )}
      {view === "linkedin-setup" && (
        <LinkedInSetup onDone={onSetupDone} onBack={backToDoors} />
      )}
    </div>
  );
}

// ---------- LinkedIn deck loading/error states ----------

function LinkedInDeckSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4"
      >
        ← Back to doors
      </button>
      <div
        className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center"
        style={{ borderColor: "#e5d8be" }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Skeleton card pulse */}
          <div
            className="w-[320px] h-[480px] rounded-2xl skeleton-pulse"
            style={{ background: "#f3e2cd" }}
          />
          <div className="text-[13px] text-ink-3">Loading your LinkedIn connections…</div>
        </div>
      </div>
    </div>
  );
}

function LinkedInDeckError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4"
      >
        ← Back to doors
      </button>
      <div
        className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center"
        style={{ borderColor: "#e5d8be" }}
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-[400px]">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "#fee2e2", color: "#ef4444" }}
          >
            <span className="text-xl">!</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-ink mb-1">
              Could not load connections
            </div>
            <div className="text-[13px] text-ink-3">{message}</div>
          </div>
          <button
            onClick={onRetry}
            className="px-4 h-9 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "#4a6f87", color: "#ffffff" }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
