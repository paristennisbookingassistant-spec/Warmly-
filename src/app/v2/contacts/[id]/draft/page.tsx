"use client";

/**
 * app/v2/contacts/[id]/draft/page.tsx
 * Draft Editor — Agent B.
 *
 * Flow:
 * 1. Fetch GET /api/contacts/{id} for header context.
 * 2. POST /api/conversations { type:"contact_session", contact_id } once → conversation_id.
 * 3. POST /api/ai/generate { artifact_type:"outreach_draft", contact_id, conversation_id }
 *    → show content.message in editable textarea; keep artifact_id.
 * 4. Variant chips / language toggle → re-generate with user_instructions; swap content.
 * 5. Send → PUT /api/artifacts/{artifact_id} { status:"sent", content:{message}, user_edit_distance }
 *    → toast → router.push back to detail.
 */

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/v2/Toast";
import type { Contact } from "@/types/database";
import { DraftHeader } from "@/components/v2/draft/DraftHeader";
import { VariantChips } from "@/components/v2/draft/VariantChips";
import { DraftComposer } from "@/components/v2/draft/DraftComposer";
import { DraftMetaPanel } from "@/components/v2/draft/DraftMetaPanel";
import { RefinePanel } from "@/components/v2/draft/RefinePanel";
import type { VariantKey, LangKey, RefineMessage } from "@/components/v2/draft/types";

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface ContactApiResponse {
  data: Contact;
  error?: string;
}

interface ConversationApiResponse {
  data: { id: string };
  error?: string;
}

interface GenerateApiResponse {
  data: {
    artifact_id: string;
    content: { message: string };
    model_used?: string;
  };
  error?: string;
}

interface ArtifactUpdateResponse {
  data: { id: string };
  error?: string;
}

function buildUserInstructions(variant: VariantKey, lang: LangKey): string {
  const parts: string[] = [];

  switch (variant) {
    case "shorter":
      parts.push("Make it shorter and punchier, 3 sentences max.");
      break;
    case "formal":
      parts.push("Use a more formal, professional register (vouvoiement if French).");
      break;
    case "ask":
      parts.push("Add a specific ask for a 20-minute call in the next two weeks.");
      break;
    case "paris":
      parts.push("Mention I'm based in Paris and happy to meet in person.");
      break;
    default:
      break;
  }

  switch (lang) {
    case "fr-tu":
      parts.push("Write in French using informal 'tu'.");
      break;
    case "fr-vous":
      parts.push("Write in French using formal 'vous'.");
      break;
    case "en":
      parts.push("Write in English.");
      break;
  }

  return parts.join(" ");
}

const VARIANT_LABELS: Record<VariantKey, string> = {
  initial: "Initial",
  shorter: "Shorter",
  formal: "Formal",
  ask: "Direct ask",
  paris: "Paris",
};

const ALL_VARIANTS: VariantKey[] = ["initial", "shorter", "formal", "ask", "paris"];

// Map a free-text message to a variant key for canned reply hints
function routeVariant(text: string, preset?: VariantKey): VariantKey {
  if (preset) return preset;
  const t = text.toLowerCase();
  if (/(formal|vous|professional)/.test(t)) return "formal";
  if (/(short|simpl|brief|tight|trim|court)/.test(t)) return "shorter";
  if (/(ask|specific|demande|call|chat|coffee)/.test(t)) return "ask";
  if (/(paris|france|local|in.person)/.test(t)) return "paris";
  return "initial";
}

const VARIANT_HINT_LABELS: Record<VariantKey, string> = {
  initial: "Base draft",
  shorter: "Shorter draft",
  formal: "More formal",
  ask: "Specific ask added",
  paris: "Paris context",
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DraftSkeleton() {
  return (
    <div className="px-10 pt-6 pb-6 max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0 fade-up">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-32 rounded-full skeleton-pulse" style={{ background: "#ece2d0" }} />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg skeleton-pulse" style={{ background: "#ece2d0" }} />
          <div className="h-8 w-28 rounded-lg skeleton-pulse" style={{ background: "#ece2d0" }} />
        </div>
      </div>
      {/* Chips skeleton */}
      <div className="flex gap-2 mb-4">
        {[80, 72, 68, 84, 62].map((w) => (
          <div
            key={w}
            className="h-8 rounded-full skeleton-pulse"
            style={{ background: "#ece2d0", width: w }}
          />
        ))}
      </div>
      {/* Two-column skeleton */}
      <div className="grid grid-cols-[1fr_360px] gap-5 flex-1">
        <div className="rounded-2xl skeleton-pulse" style={{ background: "#ece2d0" }} />
        <div className="rounded-2xl skeleton-pulse" style={{ background: "#ece2d0" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function DraftError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-10 pt-6 pb-6">
      <div className="text-[28px]">⚠</div>
      <div className="text-[15px] font-semibold text-ink">Something went wrong</div>
      <div className="text-[13px] text-ink-3 max-w-xs text-center">{message}</div>
      <button
        onClick={onRetry}
        className="h-9 px-4 text-[13px] font-medium rounded-lg transition-all"
        style={{ background: "#b87a4a", color: "#fff" }}
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DraftEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contactId } = use(params);
  const router = useRouter();
  const showToast = useToast();

  // --- Contact data ---
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // --- Conversation / artifact state ---
  const conversationIdRef = useRef<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);

  // --- Draft content ---
  const [message, setMessage] = useState("");
  const lastGeneratedRef = useRef<string>("");
  const [swapKey, setSwapKey] = useState(0);

  // --- Loading / error ---
  const [initialLoading, setInitialLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [shimmering, setShimmering] = useState(false);
  const [loadingVariant, setLoadingVariant] = useState<VariantKey | null>(null);

  // --- Variant + language ---
  const [variant, setVariant] = useState<VariantKey>("initial");
  const [lang, setLang] = useState<LangKey>("en");
  const [variantHistory, setVariantHistory] = useState<VariantKey[]>(["initial"]);

  // --- Refine chat ---
  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([
    {
      role: "agent",
      text: "Here's a first pass, tailored to your contact. Tell me how to refine it, or tap a quick prompt below.",
    },
  ]);
  const [refineTyping, setRefineTyping] = useState(false);

  // ---------------------------------------------------------------------------
  // Step 1: load contact
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadContact() {
      try {
        const res = await fetch(`/api/contacts/${contactId}`);
        if (!res.ok) throw new Error(`Contact fetch failed (${res.status})`);
        const json: ContactApiResponse = await res.json() as ContactApiResponse;
        if (json.error) throw new Error(json.error);
        if (!cancelled) setContact(json.data);
      } catch (err) {
        if (!cancelled) {
          setContactError(err instanceof Error ? err.message : "Failed to load contact.");
          setInitialLoading(false);
        }
      }
    }

    void loadContact();
    return () => { cancelled = true; };
  }, [contactId]);

  // ---------------------------------------------------------------------------
  // Step 2 + 3: create conversation + initial generate once contact loads
  // ---------------------------------------------------------------------------
  const runInitialGenerate = useCallback(async () => {
    setInitialLoading(true);
    setGenerateError(null);

    try {
      // Create conversation (idempotent — backend handles duplicate contact_sessions fine)
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact_session", contact_id: contactId }),
      });
      if (!convRes.ok) throw new Error(`Conversation create failed (${convRes.status})`);
      const convJson: ConversationApiResponse = await convRes.json() as ConversationApiResponse;
      if (convJson.error) throw new Error(convJson.error);
      conversationIdRef.current = convJson.data.id;

      // Generate initial draft
      setShimmering(true);
      const genRes = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_type: "outreach_draft",
          contact_id: contactId,
          conversation_id: conversationIdRef.current,
        }),
      });
      if (!genRes.ok) throw new Error(`Generate failed (${genRes.status})`);
      const genJson: GenerateApiResponse = await genRes.json() as GenerateApiResponse;
      if (genJson.error) throw new Error(genJson.error);

      const generated = genJson.data.content.message;
      setArtifactId(genJson.data.artifact_id);
      lastGeneratedRef.current = generated;
      setMessage(generated);
      setSwapKey((k) => k + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setShimmering(false);
      setInitialLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (contact) {
      void runInitialGenerate();
    }
  // runInitialGenerate is stable (useCallback with contactId dep)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  // ---------------------------------------------------------------------------
  // Step 4: regenerate on variant / language change
  // ---------------------------------------------------------------------------
  const regenerate = useCallback(
    async (newVariant: VariantKey, newLang: LangKey) => {
      if (!conversationIdRef.current) return;

      setLoadingVariant(newVariant);
      setShimmering(true);
      setGenerateError(null);

      try {
        const instructions = buildUserInstructions(newVariant, newLang);

        const genRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artifact_type: "outreach_draft",
            contact_id: contactId,
            conversation_id: conversationIdRef.current,
            ...(instructions ? { user_instructions: instructions } : {}),
          }),
        });
        if (!genRes.ok) throw new Error(`Generate failed (${genRes.status})`);
        const genJson: GenerateApiResponse = await genRes.json() as GenerateApiResponse;
        if (genJson.error) throw new Error(genJson.error);

        const generated = genJson.data.content.message;
        setArtifactId(genJson.data.artifact_id);
        lastGeneratedRef.current = generated;
        setMessage(generated);
        setSwapKey((k) => k + 1);
        setVariant(newVariant);
        setVariantHistory((h) => [...h, newVariant]);
      } catch (err) {
        setGenerateError(err instanceof Error ? err.message : "Regeneration failed.");
      } finally {
        setShimmering(false);
        setLoadingVariant(null);
      }
    },
    [contactId]
  );

  const handleVariant = useCallback(
    (v: VariantKey) => {
      if (v === variant && generating) return;
      void regenerate(v, lang);
    },
    [variant, lang, generating, regenerate]
  );

  const handleLang = useCallback(
    (l: LangKey) => {
      if (l === lang) return;
      setLang(l);
      void regenerate(variant, l);
    },
    [lang, variant, regenerate]
  );

  // ---------------------------------------------------------------------------
  // Refine chat handler: free-text → regenerate via appropriate variant
  // ---------------------------------------------------------------------------
  const handleRefineSend = useCallback(
    (text: string, preset?: VariantKey) => {
      const targetVariant = routeVariant(text, preset);
      const hintLabel = VARIANT_HINT_LABELS[targetVariant];

      setRefineMessages((msgs) => [...msgs, { role: "user", text }]);
      setRefineTyping(true);

      // Optimistic agent reply appears while actual API call runs
      setTimeout(() => {
        setRefineTyping(false);
        setRefineMessages((msgs) => [
          ...msgs,
          {
            role: "agent",
            text: `Regenerating with "${VARIANT_LABELS[targetVariant]}" applied…`,
            hint: { label: hintLabel },
          },
        ]);
        void regenerate(targetVariant, lang);
      }, 500);
    },
    [lang, regenerate]
  );

  const handleRevert = useCallback(() => {
    if (variantHistory.length < 2) return;
    const newHistory = variantHistory.slice(0, -1);
    const prev = newHistory[newHistory.length - 1];
    setVariantHistory(newHistory);
    void regenerate(prev, lang);
  }, [variantHistory, lang, regenerate]);

  // ---------------------------------------------------------------------------
  // Step 6: Send / finalize
  // ---------------------------------------------------------------------------
  const handleSend = useCallback(async () => {
    if (!artifactId || !contact) return;
    setSending(true);

    try {
      const editDistance = Math.abs(message.length - lastGeneratedRef.current.length);
      const res = await fetch(`/api/artifacts/${artifactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "sent",
          content: { message },
          user_edit_distance: editDistance,
        }),
      });
      if (!res.ok) throw new Error(`Send failed (${res.status})`);
      const json: ArtifactUpdateResponse = await res.json() as ArtifactUpdateResponse;
      if (json.error) throw new Error(json.error);

      const firstName = contact.name.split(" ")[0];
      showToast(`Sent to ${firstName}. Logged in your CRM.`);
      router.push(`/v2/contacts/${contactId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Send failed. Try again.");
      setSending(false);
    }
  }, [artifactId, contact, message, contactId, router, showToast]);

  const handleCopy = useCallback(() => {
    try {
      void navigator.clipboard.writeText(message);
      showToast("Draft copied to clipboard.");
    } catch {
      showToast("Copy failed — select text manually.");
    }
  }, [message, showToast]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (contactError) {
    return (
      <DraftError
        message={contactError}
        onRetry={() => {
          setContactError(null);
          setInitialLoading(true);
          window.location.reload();
        }}
      />
    );
  }

  if (initialLoading || !contact) {
    return <DraftSkeleton />;
  }

  if (generateError && !artifactId) {
    return (
      <DraftError
        message={generateError}
        onRetry={() => void runInitialGenerate()}
      />
    );
  }

  return (
    <div className="px-10 pt-6 pb-6 max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0 fade-up">
      <DraftHeader
        contact={contact}
        onBack={() => router.push(`/v2/contacts/${contactId}`)}
        onCopy={handleCopy}
        onSend={handleSend}
        sendDisabled={!artifactId || shimmering}
        sending={sending}
      />

      {/* Draft type label */}
      <div className="mb-3 flex-shrink-0">
        <div className="font-mono-tag text-ink-3 mb-3">
          Draft to {contact.name.toUpperCase()}
        </div>
        <VariantChips
          variant={variant}
          lang={lang}
          loadingVariant={loadingVariant}
          onVariant={handleVariant}
          onLang={handleLang}
        />
      </div>

      {/* Generate error banner (non-blocking — artifact may still exist) */}
      {generateError && (
        <div
          className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] flex-shrink-0"
          style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" }}
        >
          <span>Generation failed: {generateError}</span>
          <button
            onClick={() => void regenerate(variant, lang)}
            className="ml-auto text-[12px] font-medium underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-5 flex-1 min-h-0">
        {/* LEFT: composer */}
        <DraftComposer
          contact={contact}
          message={message}
          shimmering={shimmering}
          swapKey={swapKey}
          onChange={setMessage}
        />

        {/* RIGHT: meta + refine */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto scroll-area">
          <DraftMetaPanel
            contact={contact}
            variantLabel={VARIANT_LABELS[variant]}
            lang={lang}
          />
          <RefinePanel
            messages={refineMessages}
            typing={refineTyping}
            variant={variant}
            historyLen={variantHistory.length}
            totalVariants={ALL_VARIANTS.length}
            canRevert={variantHistory.length > 1}
            onSend={handleRefineSend}
            onRevert={handleRevert}
          />
        </div>
      </div>
    </div>
  );
}
