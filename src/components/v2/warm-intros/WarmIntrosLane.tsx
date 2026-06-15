"use client";

/**
 * components/v2/warm-intros/WarmIntrosLane.tsx
 * Full warm-intros page — fetches GET /api/warm-intros and renders the grid.
 *
 * "Ask for intro" CTA mirrors DraftReTouchButton:
 *  1. POST /api/conversations { type:"contact_session", contact_id: via.peer_contact_id }
 *  2. POST /api/ai/generate { artifact_type:"outreach_draft", ... } with 1 cold-start retry
 *  3. router.push → /v2/contacts/{peer_contact_id}
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/v2/Toast";
import { WarmIntroCardView } from "./WarmIntroCard";
import { WarmIntrosPageSkeleton } from "./WarmIntrosSkeleton";
import { OptInPrompt, WarmIntrosEmptyState, WarmIntrosError } from "./WarmIntrosStates";
import type { WarmIntroCard } from "./WarmIntroCard";

interface WarmIntrosResponse {
  data: { optedIn: boolean; cards: WarmIntroCard[] } | null;
  error: { code: string; message: string } | null;
}
interface ConversationResponse { data: { id: string }; error?: string; }
interface GenerateResponse {
  data: { artifact_id: string; content: { message: string } }; error?: string;
}

export function WarmIntrosLane() {
  const router = useRouter();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState(false);
  const [cards, setCards] = useState<WarmIntroCard[]>([]);
  const [draftingId, setDraftingId] = useState<string | null>(null);

  const fetchIntros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/warm-intros", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: WarmIntrosResponse = await res.json() as WarmIntrosResponse;
      if (body.error) throw new Error(body.error.message);
      setOptedIn(body.data?.optedIn ?? false);
      setCards(body.data?.cards ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warm intros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchIntros(); }, [fetchIntros]);

  const handleAskIntro = useCallback(async (card: WarmIntroCard) => {
    const { via, candidate, match_reason } = card;
    const { peer_contact_id, peer_name } = via;
    setDraftingId(peer_contact_id);
    try {
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "contact_session", contact_id: peer_contact_id }),
      });
      if (!convRes.ok) throw new Error(`Conversation failed (${convRes.status})`);
      const convJson: ConversationResponse = await convRes.json() as ConversationResponse;
      if (convJson.error) throw new Error(convJson.error);

      const titleCompany = [candidate.title, candidate.company].filter(Boolean).join(" at ");
      const instructions = `Draft a warm intro request to ${peer_name} asking them to introduce me to ${candidate.name}${titleCompany ? ` (${titleCompany})` : ""}. Reason: ${match_reason}`;
      const genBody = JSON.stringify({
        artifact_type: "outreach_draft",
        contact_id: peer_contact_id,
        conversation_id: convJson.data.id,
        user_instructions: instructions,
      });
      const callGen = () => fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: genBody,
      });
      let genRes = await callGen();
      if (!genRes.ok) { await new Promise((r) => setTimeout(r, 1200)); genRes = await callGen(); }
      if (!genRes.ok) throw new Error(`Generate failed (${genRes.status})`);
      const genJson: GenerateResponse = await genRes.json() as GenerateResponse;
      if (genJson.error) throw new Error(genJson.error);

      showToast(`Draft ready — asking ${peer_name} to intro you to ${candidate.name.split(" ")[0]}.`);
      router.push(`/v2/contacts/${peer_contact_id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Draft generation failed. Try again.");
    } finally {
      setDraftingId(null);
    }
  }, [router, showToast]);

  let body: React.ReactNode;
  if (loading)        body = <WarmIntrosPageSkeleton />;
  else if (error)     body = <WarmIntrosError message={error} onRetry={() => void fetchIntros()} />;
  else if (!optedIn)  body = <OptInPrompt />;
  else if (!cards.length) body = <WarmIntrosEmptyState />;
  else body = (
    <>
      <div className="font-mono-tag text-ink-4 mb-4" style={{ fontSize: 10.5 }}>
        {cards.length} {cards.length === 1 ? "introduction" : "introductions"} available
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <WarmIntroCardView
            key={`${card.via.peer_contact_id}-${card.candidate.name}-${i}`}
            card={card}
            onAskIntro={(c) => void handleAskIntro(c)}
            drafting={draftingId === card.via.peer_contact_id}
          />
        ))}
      </div>
    </>
  );

  return (
    <div className="px-10 pt-10 pb-14 max-w-[1100px] mx-auto fade-up">
      <div className="mb-8">
        <div className="font-mono-tag text-ink-3 mb-1.5">Warm Intros</div>
        <h1 className="font-display text-[32px] leading-[1.05] text-ink mb-2" style={{ fontStyle: "italic" }}>
          2nd-degree introductions
        </h1>
        <p className="text-[13.5px] leading-relaxed max-w-[520px]" style={{ color: "var(--ink-3)" }}>
          People your connections can introduce you to — each card shows who the bridge
          is. Tap to draft a warm intro request in one click.
        </p>
      </div>
      {body}
    </div>
  );
}
