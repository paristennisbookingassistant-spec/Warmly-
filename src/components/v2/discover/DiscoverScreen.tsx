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
import type { DirectoryProfile, ListDirectoryResponse, SaveDirectoryResponse } from "@/types/directory";

// ---------- API response shapes ----------

interface ContactsApiResponse {
  data: {
    items: Contact[];
    total: number;
    has_more: boolean;
  };
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

// Keyword → CANONICAL directory `industries` values (must match the stored
// Title-Case strings; the backend does case-sensitive array overlap). Multiple
// canonical values are comma-joined so the overlap matches any of them.
const INDUSTRY_KEYWORDS: Array<{ re: RegExp; value: string }> = [
  { re: /(consult(ing|ant)|strategy)/i, value: "Consulting" },
  { re: /(venture|vc\b|\bpe\b|private equity|investing|investor)/i, value: "Venture Capital,Private Equity" },
  { re: /(finance|banking|investment bank|asset management)/i, value: "Investment Banking,Banking,Asset Management" },
  { re: /(pharma|life science|healthcare|biotech)/i, value: "Healthcare/Pharma" },
  { re: /(\bai\b|tech\b|software|saas|product)/i, value: "Tech,Tech / AI" },
  { re: /(startup|entrepreneur|founder)/i, value: "Startup/Entrepreneurship" },
  { re: /(consumer|retail|fmcg|luxury)/i, value: "Consumer/Retail" },
  { re: /(real estate|property)/i, value: "Real Estate" },
  { re: /(energy|cleantech|climate)/i, value: "Energy" },
];

// Cities → routed to free-text `search` (matches the location field), NOT the
// country-level `geography` array.
const CITY_RE = /\b(paris|singapore|berlin|london|new york|nyc|hong kong|dubai|amsterdam|munich|zurich|shanghai|tokyo|sydney|geneva|madrid|milan)\b/i;

function parseInseadInstruction(text: string): DirectoryParams {
  // Cohort: "mba26j", "26d", "december", "july"
  const cohortMatch = text.match(/\b(mba\d{2}[dj]|\d{2}[dj])\b/i);
  if (cohortMatch) {
    const c = cohortMatch[1].toLowerCase();
    return { cohort: c.startsWith("mba") ? c : `mba${c}` };
  }
  if (/\bdecember\b/i.test(text)) return { cohort: "mba26d" };
  if (/\bjuly\b/i.test(text)) return { cohort: "mba26j" };

  // City → location search
  const city = text.match(CITY_RE);
  if (city) return { search: city[1] };

  // Industry → canonical values
  for (const { re, value } of INDUSTRY_KEYWORDS) {
    if (re.test(text)) return { industry: value };
  }

  // "at/from Company"
  const companyMatch = text.match(/(?:at|from|with)\s+([A-Z][a-zA-Z&]+(?:\s[A-Z][a-zA-Z&]+)?)/);
  if (companyMatch) return { company: companyMatch[1] };

  // Fallback: full-text search
  return { search: text.trim() };
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

// ---------- Scoring helper (bounded batch + hard timeout) ----------

// Only score the front of the deck — the cards the user actually sees before
// swiping. Ranking the whole 24-25 set in one MiniMax call blows past the
// serverless timeout (504). 8 is fast and covers the visible window.
const SCORE_BATCH = 8;
// Scoring is a non-blocking enhancement (the deck is usable immediately). The
// MiniMax rank is a reasoning call (~15-25s, occasionally longer under load);
// give it a realistic window so the tiers/rationale actually land, but always
// abort by here so nothing ever hangs.
const RANK_TIMEOUT_MS = 35_000;

interface RankItem {
  score: number;
  tier: number;
  reasoning: string;
  hook: string;
  rank: number;
}

/**
 * POSTs the first SCORE_BATCH card ids to a rank endpoint with a hard timeout.
 * Returns the rankings array, or null on timeout / non-ok / error (caller keeps
 * the unscored deck). `idKey` is the id field the endpoint echoes back
 * ("directory_id" or "contact_id").
 */
async function rankWithTimeout(
  url: string,
  ids: string[],
  idField: "directory_ids" | "contact_ids"
): Promise<Array<RankItem & { id: string }> | null> {
  const batch = ids.slice(0, SCORE_BATCH);
  if (batch.length === 0) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RANK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({ [idField]: batch, top_n: Math.min(batch.length, 20) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { rankings?: Array<Record<string, unknown>> } | null;
    };
    const rankings = json.data?.rankings ?? null;
    if (!rankings) return null;
    const echoed = idField === "directory_ids" ? "directory_id" : "contact_id";
    return rankings.map((r) => ({
      id: String(r[echoed]),
      score: Number(r.score ?? 0),
      tier: Number(r.tier ?? 3),
      reasoning: String(r.reasoning ?? ""),
      hook: String(r.hook ?? ""),
      rank: Number(r.rank ?? 999),
    }));
  } catch {
    return null; // timeout/abort/network — graceful, keep unscored
  } finally {
    clearTimeout(timer);
  }
}

function applyRankByMap(deck: DeckCard[], ranks: Array<RankItem & { id: string }>): DeckCard[] {
  const map = new Map(ranks.map((r) => [r.id, r]));
  return deck
    .map((card) => {
      const r = map.get(card.id);
      return r ? { ...card, tier: tierLabelFromNumber(r.tier), rationale: r.reasoning } : card;
    })
    .sort((a, b) => (map.get(a.id)?.rank ?? 999) - (map.get(b.id)?.rank ?? 999));
}

// ---------- DiscoverScreen ----------

type View = "doors" | "cv-tinder" | "linkedin-setup" | "linkedin-tinder";

export function DiscoverScreen() {
  const toast = useToast();
  const [view, setView] = useState<View>("doors");

  // --- INSEAD deck state ---
  const [cvDeck, setCvDeck] = useState<DeckCard[]>([]);
  const [cvTotal, setCvTotal] = useState(0);
  const [cvLoading, setCvLoading] = useState(false); // full-screen skeleton — INITIAL load only
  const [cvRefining, setCvRefining] = useState(false); // in-place refine reload (keeps deck+chat mounted)
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

  // Returns the number of results (so a refine can detect 0-match and not empty the deck).
  const fetchAndScoreCvDeck = useCallback(
    async (params: DirectoryParams = {}, opts: { refine?: boolean } = {}): Promise<number> => {
      // Refine reloads update IN PLACE (keep the deck + chat mounted); only the
      // very first load shows the full-screen skeleton.
      if (opts.refine) setCvRefining(true);
      else { setCvLoading(true); setCvDeck([]); }
      setCvError(null);
      try {
        const url = buildDirectoryUrl({ per_page: 24, ...params });
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ListDirectoryResponse;
        if (json.error) throw new Error(json.error.message);
        const items = json.data?.items ?? [];
        const cards = items.map(directoryToDeckCard);

        // On a refine that matched nothing, KEEP the current deck (don't empty it).
        if (opts.refine && cards.length === 0) {
          setCvRefining(false);
          return 0;
        }
        setCvTotal(json.data?.total ?? items.length);
        setCvDeck(cards);
        setCvLoading(false);
        setCvRefining(false);

        // Score the visible front of the deck (bounded + hard timeout — never hangs).
        if (cards.length > 0) {
          setCvScoring(true);
          const ranks = await rankWithTimeout("/api/directory/rank", cards.map((c) => c.id), "directory_ids");
          if (ranks) setCvDeck((prev) => applyRankByMap(prev, ranks));
          setCvScoring(false);
        }
        return cards.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load INSEAD directory";
        if (opts.refine) { setCvRefining(false); return -1; } // keep current deck on refine error
        setCvError(msg);
        setCvLoading(false);
        return -1;
      }
    },
    []
  );

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

      // Score the visible front of the deck (bounded + hard timeout).
      if (cards.length > 0) {
        setLiveScoring(true);
        const ranks = await rankWithTimeout("/api/ai/rank-batch", cards.map((c) => c.id), "contact_ids");
        if (ranks) setLiveDeck((prev) => applyRankByMap(prev, ranks));
        setLiveScoring(false);
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
    const what = params.cohort
      ? `cohort ${params.cohort.toUpperCase()}`
      : params.industry
        ? params.industry.split(",")[0]
        : params.company
          ? params.company
          : params.search ?? "that";

    const n = await fetchAndScoreCvDeck(params, { refine: true });
    if (n === 0) return `No INSEAD alumni matched ${what}. Keeping the current queue — try another angle (e.g. "consulting", "VC", "Paris").`;
    if (n < 0) return `Couldn't reach the directory just now — the queue is unchanged. Try again in a moment.`;
    return `Filtered to ${what} — ${n} alumni in the queue, strongest matches first.`;
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

    // Honesty: if a filter was applied but matched nothing, say so and keep the
    // current deck (don't silently fall back to the full set with a fake count).
    if (filterLabel && filtered.length === 0) {
      return `No connections matched "${filterLabel}". Keeping the current deck — try another keyword.`;
    }

    const base = filtered;
    setLiveScoring(true);
    const ranks = await rankWithTimeout("/api/ai/rank-batch", base.map((c) => c.id), "contact_ids");
    setLiveScoring(false);
    const reranked = ranks ? applyRankByMap(base, ranks) : base;
    setLiveDeck(reranked);
    const label = filterLabel ? `${filterLabel} (${reranked.length} leads)` : `Re-ranked ${reranked.length} leads`;
    return `${label} — deck updated, strongest matches first.`;
  }, [liveDeck]);

  // ---------- Render: INSEAD tinder ----------

  if (view === "cv-tinder") {
    if (cvLoading) return <CvDeckSkeleton onBack={backToDoors} />;
    if (cvError) return <CvDeckError message={cvError} onRetry={() => void fetchAndScoreCvDeck()} onBack={backToDoors} />;
    return (
      <TinderView
        channel="cv"
        deck={cvDeck}
        scoring={cvScoring || cvRefining}
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
