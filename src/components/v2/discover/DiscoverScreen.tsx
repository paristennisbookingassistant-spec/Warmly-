"use client";

/**
 * components/v2/discover/DiscoverScreen.tsx
 * Top-level state machine for the Discover experience.
 * States: doors | cv-tinder | linkedin-setup | linkedin-tinder
 *
 * INSEAD door: fetches GET /api/directory, scores via POST /api/directory/rank,
 *   saves via POST /api/directory/save. Refine chat re-queries the directory.
 * LinkedIn door: fetches live pending contacts, scores via POST /api/ai/rank-batch.
 *   Refine chat filters client-side + re-ranks.
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../Toast";
import { tierLabelFromNumber } from "../palette";
import { DoorsView } from "./Doors";
import { TinderView } from "./TinderView";
import { LinkedInSetup } from "./LinkedInSetup";
import { LINKEDIN_DEMO_DECK } from "./seed";
import type { DeckCard } from "./types";
import type { Contact, LinkedInExperienceEntry, LinkedInEducationEntry } from "@/types/database";
import type { DirectoryProfile, ListDirectoryResponse, SaveDirectoryResponse, RankDirectoryResponse } from "@/types/directory";

// ---------- API response shapes ----------

interface ContactsApiResponse {
  data: {
    items: Contact[];
    total: number;
    has_more: boolean;
  };
}

interface RankBatchResponse {
  data: {
    rankings: Array<{
      contact_id: string;
      score: number;
      tier: number;
      reasoning: string;
      hook: string;
      rank: number;
    }>;
  } | null;
  error: { code: string; message: string } | null;
}

// ---------- Directory query params for refine ----------

interface DirectoryParams {
  cohort?: string;
  company?: string;
  industry?: string;
  geo?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

// ---------- Phrase → DirectoryParams parser ----------

function parseInseadInstruction(text: string): DirectoryParams {
  const t = text.toLowerCase();

  // Cohort detection: "mba26j", "26d", "26j", "december", "july"
  const cohortMatch = text.match(/\b(mba\d{2}[dj]|\d{2}[dj])\b/i);
  if (cohortMatch) return { cohort: cohortMatch[1].toLowerCase() };
  if (/\bdecember\b/.test(t)) return { cohort: "mba26d" };
  if (/\bjuly\b/.test(t)) return { cohort: "mba26j" };

  // Industry keywords
  if (/(consult(ing|ant))/i.test(t)) return { industry: "consulting" };
  if (/(venture|vc\b|investing|private equity|\bpe\b)/i.test(t)) return { industry: "venture capital" };
  if (/(pharma|life science|healthcare)/i.test(t)) return { industry: "pharma" };
  if (/(tech\b|software|saas)/i.test(t)) return { industry: "technology" };
  if (/(finance|banking|investment bank)/i.test(t)) return { industry: "finance" };
  if (/(gtm|go-?to-?market|commercial|sales)/i.test(t)) return { industry: "sales" };

  // Geography
  if (/\bparis\b/.test(t)) return { geo: "paris" };
  if (/\bsingapore\b/.test(t)) return { geo: "singapore" };
  if (/\bberlin\b/.test(t)) return { geo: "berlin" };
  if (/\blondon\b/.test(t)) return { geo: "london" };
  if (/\bnew york\b|\bnyc\b/.test(t)) return { geo: "new york" };

  // Company names (catch-all: if a word looks like a proper noun after common prepositions)
  const companyMatch = text.match(/(?:at|from|in|with)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if (companyMatch) return { company: companyMatch[1] };

  // Fallback: use the raw text as a full-text search
  return { search: text };
}

// ---------- buildDirectoryUrl helper ----------

function buildDirectoryUrl(params: DirectoryParams): string {
  const p = new URLSearchParams();
  if (params.cohort) p.set("cohort", params.cohort);
  if (params.company) p.set("company", params.company);
  if (params.industry) p.set("industry", params.industry);
  if (params.geo) p.set("geo", params.geo);
  if (params.search) p.set("search", params.search);
  p.set("per_page", String(params.per_page ?? 24));
  p.set("page", String(params.page ?? 1));
  return `/api/directory?${p.toString()}`;
}

// ---------- DirectoryProfile → DeckCard mapper ----------

function expBulletDir(exp: LinkedInExperienceEntry): string {
  if (exp.title && exp.company) return `${exp.title} @ ${exp.company}`;
  return exp.title ?? exp.company ?? "";
}

function directoryToDeckCard(p: DirectoryProfile): DeckCard {
  const expBullets = (p.experience ?? []).slice(0, 2).map(expBulletDir).filter(Boolean);
  const latestEdu = (p.education_v2 ?? [])[0];
  const eduBullet = latestEdu ? `${latestEdu.school}${latestEdu.degree ? ` · ${latestEdu.degree}` : ""}` : null;
  const about = [...expBullets, ...(eduBullet ? [eduBullet] : [])].slice(0, 3);

  // Derive INSEAD short from cohort or education
  let inseadShort: string | null = null;
  if (p.cohort) {
    // "mba26d" → "26D", "mba26j" → "26J", "26D" → "26D"
    const m = p.cohort.match(/(\d{2}[dj])/i);
    inseadShort = m ? m[1].toUpperCase() : p.cohort.toUpperCase();
  }

  const ribbonLabel = p.cohort
    ? `INSEAD CV book · ${p.cohort.toUpperCase()} · 1st`
    : "INSEAD CV book · 1st";

  return {
    id: p.id,
    name: p.name,
    role: p.current_title ?? null,
    company: p.company ?? null,
    location: p.location ?? null,
    avatar: p.photo_url ?? null,
    linkedinUrl: p.linkedin_url ?? null,
    tier: null,          // Filled after scoring
    rationale: ribbonLabel,  // Temporary; replaced after scoring
    about,
    inseadShort,
    channel: "cv",
  };
}

// ---------- Contact → DeckCard mapper (LinkedIn) ----------

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
  if (entry.degree) {
    const m = entry.degree.match(/(\d{2}[DJ])/i);
    if (m) return m[1].toUpperCase();
  }
  return "INSEAD";
}

function contactToDeckCard(c: Contact): DeckCard {
  const expBullets: string[] = (c.experience ?? []).slice(0, 2).map(expBullet);
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

// ---------- Apply ranking to deck ----------

interface InseadRankItem {
  directory_id: string;
  score: number;
  tier: number;
  reasoning: string;
  hook: string;
  rank: number;
}

interface LinkedInRankItem {
  contact_id: string;
  score: number;
  tier: number;
  reasoning: string;
  hook: string;
  rank: number;
}

function applyRankingToInsead(deck: DeckCard[], rankings: InseadRankItem[]): DeckCard[] {
  const map = new Map(rankings.map((r) => [r.directory_id, r]));
  return deck
    .map((card) => {
      const r = map.get(card.id);
      if (!r) return card;
      return { ...card, tier: tierLabelFromNumber(r.tier), rationale: r.reasoning };
    })
    .sort((a, b) => {
      const ra = map.get(a.id)?.rank ?? 999;
      const rb = map.get(b.id)?.rank ?? 999;
      return ra - rb;
    });
}

function applyRankingToLinkedIn(deck: DeckCard[], rankings: LinkedInRankItem[]): DeckCard[] {
  const map = new Map(rankings.map((r) => [r.contact_id, r]));
  return deck
    .map((card) => {
      const r = map.get(card.id);
      if (!r) return card;
      return { ...card, tier: tierLabelFromNumber(r.tier), rationale: r.reasoning };
    })
    .sort((a, b) => {
      const ra = map.get(a.id)?.rank ?? 999;
      const rb = map.get(b.id)?.rank ?? 999;
      return ra - rb;
    });
}

// ---------- DiscoverScreen ----------

type View = "doors" | "cv-tinder" | "linkedin-setup" | "linkedin-tinder";

export function DiscoverScreen() {
  const toast = useToast();
  const [view, setView] = useState<View>("doors");

  // --- INSEAD deck state ---
  const [cvDeck, setCvDeck] = useState<DeckCard[]>([]);
  const [cvTotal, setCvTotal] = useState(0);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvScoring, setCvScoring] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  // --- LinkedIn deck state ---
  const [liveDeck, setLiveDeck] = useState<DeckCard[]>([]);
  const [livePendingTotal, setLivePendingTotal] = useState(0);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveScoring, setLiveScoring] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  // ---------- INSEAD: fetch + score ----------

  const fetchAndScoreCvDeck = useCallback(async (params: DirectoryParams = {}) => {
    setCvLoading(true);
    setCvError(null);
    setCvDeck([]);
    try {
      const url = buildDirectoryUrl({ per_page: 24, ...params });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ListDirectoryResponse;
      if (json.error) throw new Error(json.error.message);
      const items = json.data?.items ?? [];
      setCvTotal(json.data?.total ?? items.length);
      const cards = items.map(directoryToDeckCard);
      setCvDeck(cards);
      setCvLoading(false);

      // Score in background
      if (cards.length > 0) {
        setCvScoring(true);
        try {
          const rankRes = await fetch("/api/directory/rank", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ directory_ids: cards.map((c) => c.id), top_n: cards.length }),
          });
          if (rankRes.ok) {
            const rankJson = (await rankRes.json()) as RankDirectoryResponse;
            if (rankJson.data?.rankings) {
              setCvDeck((prev) => applyRankingToInsead(prev, rankJson.data!.rankings));
            }
          }
        } catch {
          // Graceful: keep unscored order
        } finally {
          setCvScoring(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load INSEAD directory";
      setCvError(msg);
      setCvLoading(false);
    }
  }, []);

  // ---------- LinkedIn: fetch + score ----------

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
      const cards = items.map(contactToDeckCard);
      setLiveDeck(cards);
      setLiveLoading(false);

      // Score in background
      if (cards.length > 0) {
        setLiveScoring(true);
        try {
          const rankRes = await fetch("/api/ai/rank-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ contact_ids: cards.map((c) => c.id), top_n: cards.length }),
          });
          if (rankRes.ok) {
            const rankJson = (await rankRes.json()) as RankBatchResponse;
            if (rankJson.data?.rankings) {
              setLiveDeck((prev) => applyRankingToLinkedIn(prev, rankJson.data!.rankings));
            }
          }
        } catch {
          // Graceful: keep unscored order
        } finally {
          setLiveScoring(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load contacts";
      setLiveError(msg);
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveDeck();
  }, [fetchLiveDeck]);

  // ---------- Navigation ----------

  const openCV = () => {
    if (cvDeck.length === 0 && !cvLoading && !cvError) {
      void fetchAndScoreCvDeck();
    }
    setView("cv-tinder");
  };
  const openLinkedIn = () => setView(linkedInConnected ? "linkedin-tinder" : "linkedin-setup");
  const onSetupDone = () => setView("linkedin-tinder");
  const backToDoors = () => setView("doors");

  // ---------- INSEAD: save ----------

  const handleCvSave = useCallback(async (card: DeckCard) => {
    try {
      const res = await fetch("/api/directory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ directory_id: card.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SaveDirectoryResponse;
      if (json.error) throw new Error(json.error.message);
      const first = card.name.split(" ")[0];
      if (json.already_saved) {
        toast(`${first} is already in your contacts.`);
      } else {
        toast(`Saved ${first} to your contacts.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast(`Could not save ${card.name}: ${msg}`);
    }
  }, [toast]);

  const handleCvSkip = useCallback((_card: DeckCard) => {
    // No server action needed for INSEAD skip
  }, []);

  // ---------- INSEAD: refine chat ----------

  const handleCvRefine = useCallback(async (text: string): Promise<string> => {
    const params = parseInseadInstruction(text);
    // Build a human-readable description of what we're doing
    let replyText = "Refining the queue…";
    if (params.cohort) replyText = `Filtering to cohort ${params.cohort.toUpperCase()}.`;
    else if (params.industry) replyText = `Filtering by industry: ${params.industry}.`;
    else if (params.geo) replyText = `Narrowing to ${params.geo}-based alumni only.`;
    else if (params.company) replyText = `Filtering by company: ${params.company}.`;
    else if (params.search) replyText = `Searching the directory for "${params.search}".`;

    try {
      await fetchAndScoreCvDeck(params);
      return `${replyText} Deck updated — swipe through the new results.`;
    } catch {
      return `${replyText} Something went wrong fetching results — the deck may be unchanged.`;
    }
  }, [fetchAndScoreCvDeck]);

  // ---------- LinkedIn: save / skip ----------

  const handleLinkedInSave = useCallback(async (card: DeckCard) => {
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
      console.error("[DiscoverScreen] save failed:", err);
    }
  }, [toast]);

  const handleLinkedInSkip = useCallback(async (card: DeckCard) => {
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
  }, []);

  // ---------- LinkedIn: refine chat ----------

  const handleLinkedInRefine = useCallback(async (text: string): Promise<string> => {
    const t = text.toLowerCase();

    // Client-side filter first
    const allCards = liveDeck;
    let filtered = allCards;
    let filterLabel = "";

    if (/\bparis\b/.test(t)) {
      filtered = allCards.filter((c) => c.location?.toLowerCase().includes("paris") ?? false);
      filterLabel = "Paris-based only";
    } else if (/\bsingapore\b/.test(t)) {
      filtered = allCards.filter((c) => c.location?.toLowerCase().includes("singapore") ?? false);
      filterLabel = "Singapore-based only";
    } else if (/\bberlin\b/.test(t)) {
      filtered = allCards.filter((c) => c.location?.toLowerCase().includes("berlin") ?? false);
      filterLabel = "Berlin-based only";
    } else if (/(vc\b|venture|investing)/i.test(t)) {
      filtered = allCards.filter((c) =>
        [c.role, c.company, c.rationale].some((f) =>
          /(vc|venture|invest|capital|fund)/i.test(f ?? "")
        )
      );
      filterLabel = "VC / investing profiles";
    } else if (/(consult(ing|ant))/i.test(t)) {
      filtered = allCards.filter((c) =>
        [c.role, c.company, c.rationale].some((f) =>
          /consult/i.test(f ?? "")
        )
      );
      filterLabel = "Consulting backgrounds";
    } else if (/(product|pm\b)/i.test(t)) {
      filtered = allCards.filter((c) => /(product|pm\b)/i.test(c.role ?? ""));
      filterLabel = "Product Manager roles";
    }

    // If filter narrows things, use filtered; otherwise fall back to full deck
    const base = filtered.length > 0 ? filtered : allCards;

    // Re-rank the filtered set
    if (base.length > 0) {
      try {
        const rankRes = await fetch("/api/ai/rank-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ contact_ids: base.map((c) => c.id), top_n: base.length }),
        });
        if (rankRes.ok) {
          const rankJson = (await rankRes.json()) as RankBatchResponse;
          if (rankJson.data?.rankings) {
            const reranked = applyRankingToLinkedIn(base, rankJson.data.rankings);
            setLiveDeck(reranked);
            const label = filterLabel ? `${filterLabel} (${reranked.length} leads)` : `Re-ranked ${reranked.length} leads`;
            return `${label} — deck updated, strongest matches are at the top.`;
          }
        }
      } catch {
        // Graceful: just apply client filter without re-rank
      }
      setLiveDeck(base);
      const label = filterLabel ? `${filterLabel} (${base.length} leads)` : `Refined to ${base.length} leads`;
      return `${label} — deck updated.`;
    }

    return "No matching contacts found for that filter. Try a different keyword or clear the filter.";
  }, [liveDeck]);

  // ---------- Render: INSEAD tinder ----------

  if (view === "cv-tinder") {
    if (cvLoading) return <CvDeckSkeleton onBack={backToDoors} />;
    if (cvError) return <CvDeckError message={cvError} onRetry={() => void fetchAndScoreCvDeck()} onBack={backToDoors} />;
    return (
      <TinderView
        channel="cv"
        deck={cvDeck}
        scoring={cvScoring}
        totalCount={cvTotal}
        onBack={backToDoors}
        onSave={handleCvSave}
        onSkip={handleCvSkip}
        onRefine={handleCvRefine}
      />
    );
  }

  // ---------- Render: LinkedIn tinder ----------

  if (view === "linkedin-tinder") {
    if (liveLoading) return <LinkedInDeckSkeleton onBack={backToDoors} />;
    if (liveError) return (
      <LinkedInDeckError message={liveError} onRetry={fetchLiveDeck} onBack={backToDoors} />
    );
    const deck = liveDeck.length > 0 ? liveDeck : LINKEDIN_DEMO_DECK;
    return (
      <TinderView
        channel="linkedin"
        deck={deck}
        scoring={liveScoring}
        totalCount={livePendingTotal}
        onBack={backToDoors}
        onSave={handleLinkedInSave}
        onSkip={handleLinkedInSkip}
        onRefine={handleLinkedInRefine}
      />
    );
  }

  // ---------- Render: doors / setup ----------

  return (
    <div className="px-10 pt-7 pb-6 max-w-[1280px] mx-auto flex-1 flex flex-col w-full">
      {view === "doors" && (
        <DoorsView
          linkedInConnected={linkedInConnected}
          linkedInPendingCount={livePendingTotal}
          cvQueueCount={cvTotal > 0 ? cvTotal : 961}
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

// ---------- Skeleton / error states ----------

function CvDeckSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4">
        ← Back to doors
      </button>
      <div className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center" style={{ borderColor: "#e5d8be" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-[320px] h-[480px] rounded-2xl skeleton-pulse" style={{ background: "#f3e2cd" }} />
          <div className="text-[13px] text-ink-3">Loading INSEAD directory…</div>
        </div>
      </div>
    </div>
  );
}

function CvDeckError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4">
        ← Back to doors
      </button>
      <div className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center" style={{ borderColor: "#e5d8be" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-[400px]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#fee2e2", color: "#ef4444" }}>
            <span className="text-xl">!</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-ink mb-1">Could not load the directory</div>
            <div className="text-[13px] text-ink-3">{message}</div>
          </div>
          <button onClick={onRetry} className="px-4 h-9 rounded-lg text-[13px] font-medium transition-colors" style={{ background: "#b87a4a", color: "#ffffff" }}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkedInDeckSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4">
        ← Back to doors
      </button>
      <div className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center" style={{ borderColor: "#e5d8be" }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-[320px] h-[480px] rounded-2xl skeleton-pulse" style={{ background: "#dde6ee" }} />
          <div className="text-[13px] text-ink-3">Loading your LinkedIn connections…</div>
        </div>
      </div>
    </div>
  );
}

function LinkedInDeckError({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-8 pt-6 pb-6 max-w-[1320px] mx-auto w-full">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-4">
        ← Back to doors
      </button>
      <div className="flex-1 bg-white border rounded-3xl overflow-hidden flex items-center justify-center" style={{ borderColor: "#e5d8be" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-[400px]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#fee2e2", color: "#ef4444" }}>
            <span className="text-xl">!</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-ink mb-1">Could not load connections</div>
            <div className="text-[13px] text-ink-3">{message}</div>
          </div>
          <button onClick={onRetry} className="px-4 h-9 rounded-lg text-[13px] font-medium transition-colors" style={{ background: "#4a6f87", color: "#ffffff" }}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
