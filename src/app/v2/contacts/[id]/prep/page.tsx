"use client";

/**
 * app/v2/contacts/[id]/prep/page.tsx
 * Meeting Prep page — Agent B, V2 Phase 3.
 *
 * Flow:
 * 1. GET /api/contacts/{id} for header context.
 * 2. Show intake form (purpose, duration, goal, focus).
 * 3. On submit:
 *    a. POST /api/conversations { type:"contact_session", contact_id } → conversation_id.
 *    b. POST /api/ai/generate { artifact_type:"meeting_prep", ... } → MeetingPrepContent.
 * 4. Render 4-tab brief (Snapshot, Company, Questions, Agenda) + live notes sidebar.
 * 5. Save notes → PUT /api/contacts/{id} { notes }.
 */

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/v2/Toast";
import type { Contact } from "@/types/database";
import { PrepIntakeForm } from "@/components/v2/prep/PrepIntakeForm";
import { PrepLoading } from "@/components/v2/prep/PrepLoading";
import { PrepBriefHeader } from "@/components/v2/prep/PrepBriefHeader";
import { SnapshotTab } from "@/components/v2/prep/SnapshotTab";
import { CompanyTab } from "@/components/v2/prep/CompanyTab";
import { QuestionsTab } from "@/components/v2/prep/QuestionsTab";
import { AgendaTab } from "@/components/v2/prep/AgendaTab";
import { LiveNotesPanel } from "@/components/v2/prep/LiveNotesPanel";
import { ContactLoadingSkeleton, PrepError } from "@/components/v2/prep/PrepPageHelpers";
import { useLiveNotes } from "@/components/v2/prep/useLiveNotes";
import type {
  IntakeFormValues,
  GeneratedBrief,
  PrepTab,
  MeetingPrepContent,
  DiscussionTheme,
} from "@/components/v2/prep/types";

// ---------------------------------------------------------------------------
// API response shapes (typed; no `any`)
// ---------------------------------------------------------------------------

interface ContactApiResponse {
  data: Contact;
  error?: string | null;
}

interface ConversationApiResponse {
  data: { id: string };
  error?: string | null;
}

interface GenerateApiResponse {
  data: { artifact_id: string; content: MeetingPrepContent };
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Build markdown for clipboard export
// ---------------------------------------------------------------------------

function buildMarkdown(
  brief: GeneratedBrief,
  notes: Record<string, string>,
  contactName: string
): string {
  const lines: string[] = [
    `# Meeting notes — ${contactName}`,
    `*${brief.intake.duration} min · ${brief.intake.purpose.toLowerCase()}*`,
    "",
  ];
  if (notes.preMeeting) lines.push(`**Pre-meeting state:** ${notes.preMeeting}`);
  if (notes.firstImpressions) lines.push(`**First impressions:** ${notes.firstImpressions}`, "");
  const themes = brief.content.discussion_themes ?? [];
  themes.forEach((theme, ti) => {
    lines.push(`## ${theme.name}`);
    (theme.questions ?? []).forEach((q, qi) => {
      lines.push(`**Q: ${q}**`, notes[`theme-${ti}-q-${qi}`] ?? "_(no notes)_", "");
    });
  });
  lines.push("## Wrap-up");
  if (notes.asksMade) lines.push(`**Asks made:** ${notes.asksMade}`);
  if (notes.followUps) lines.push(`**Follow-ups:** ${notes.followUps}`);
  if (notes.surprises) lines.push(`**Surprises:** ${notes.surprises}`);
  if (notes.gutRead) lines.push(`**Gut read:** ${notes.gutRead}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MeetingPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contactId } = use(params);
  const router = useRouter();
  const showToast = useToast();

  // Contact
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactLoading, setContactLoading] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);

  // Phase machine
  const [phase, setPhase] = useState<"intake" | "generating" | "brief" | "error">("intake");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Brief + tab
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [activeTab, setActiveTab] = useState<PrepTab>("snapshot");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // Live notes
  const [notes, setNote] = useLiveNotes(brief?.artifactId ?? null);

  // ------------------------------------------------------------------
  // Load contact
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/contacts/${contactId}`);
        if (!res.ok) throw new Error(`Contact fetch failed (${res.status})`);
        const json = (await res.json()) as ContactApiResponse;
        if (json.error) throw new Error(json.error);
        if (!cancelled) setContact(json.data);
      } catch (err) {
        if (!cancelled)
          setContactError(err instanceof Error ? err.message : "Failed to load contact.");
      } finally {
        if (!cancelled) setContactLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [contactId]);

  // ------------------------------------------------------------------
  // Keyboard shortcuts 1–4 for tabs (brief phase only)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== "brief") return;
    const MAP: Record<string, PrepTab> = {
      "1": "snapshot", "2": "company", "3": "agenda", "4": "questions",
    };
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const t = MAP[e.key];
      if (t) setActiveTab(t);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // ------------------------------------------------------------------
  // Generate brief
  // ------------------------------------------------------------------
  const handleGenerate = useCallback(async (intake: IntakeFormValues) => {
    setPhase("generating");
    setGenerationError(null);
    try {
      // Create conversation
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "contact_session", contact_id: contactId }),
      });
      if (!convRes.ok) throw new Error(`Conversation create failed (${convRes.status})`);
      const convJson = (await convRes.json()) as ConversationApiResponse;
      if (convJson.error) throw new Error(convJson.error);
      setConversationId(convJson.data.id); // reused by the notes-synthesis call

      // Build instructions from intake
      const userInstructions = [
        `Purpose: ${intake.purpose}.`,
        `Duration: ${intake.duration} minutes.`,
        `Goal: ${intake.goal}.`,
        intake.focus ? `Additional context: ${intake.focus}.` : "",
      ].filter(Boolean).join(" ");

      // Generate meeting_prep. The AI route can cold-start and 500 on the first
      // (cold) call of a session; retry once silently so the user doesn't see a
      // spurious error + a wiped form (same pattern as the draft editor).
      const genBody = JSON.stringify({
        artifact_type: "meeting_prep",
        contact_id: contactId,
        conversation_id: convJson.data.id,
        user_instructions: userInstructions,
      });
      const callGen = () =>
        fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: genBody,
        });
      let genRes = await callGen();
      if (!genRes.ok) {
        await new Promise((r) => setTimeout(r, 1500));
        genRes = await callGen();
      }
      if (!genRes.ok) throw new Error(`Generation failed (${genRes.status})`);
      const genJson = (await genRes.json()) as GenerateApiResponse;
      if (genJson.error) throw new Error(genJson.error);

      setBrief({ artifactId: genJson.data.artifact_id, content: genJson.data.content, intake });
      setPhase("brief");
      setActiveTab("snapshot");
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed. Please retry.");
      setPhase("error");
    }
  }, [contactId]);

  // ------------------------------------------------------------------
  // Copy notes
  // ------------------------------------------------------------------
  const handleCopyNotes = useCallback(() => {
    if (!brief || !contact) return;
    const md = buildMarkdown(brief, notes, contact.name);
    navigator.clipboard
      .writeText(md)
      .then(() => showToast("Notes copied as markdown."))
      .catch(() => showToast("Copy failed — select text manually."));
  }, [brief, notes, contact, showToast]);

  // ------------------------------------------------------------------
  // Editable questions — mutate discussion_themes + persist to the artifact
  // ------------------------------------------------------------------
  const persistThemes = useCallback(
    async (nextThemes: DiscussionTheme[], prevThemes: DiscussionTheme[]) => {
      if (!brief) return;
      setSavingQuestions(true);
      try {
        const res = await fetch(`/api/artifacts/${brief.artifactId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { ...brief.content, discussion_themes: nextThemes },
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      } catch {
        // Roll back the optimistic update.
        setBrief((b) =>
          b ? { ...b, content: { ...b.content, discussion_themes: prevThemes } } : b
        );
        showToast("Couldn't save your edit — reverted.");
      } finally {
        setSavingQuestions(false);
      }
    },
    [brief, showToast]
  );

  const mutateThemes = useCallback(
    (mutator: (themes: DiscussionTheme[]) => DiscussionTheme[]) => {
      setBrief((b) => {
        if (!b) return b;
        const prev = b.content.discussion_themes ?? [];
        const next = mutator(prev.map((t) => ({ ...t, questions: [...(t.questions ?? [])] })));
        void persistThemes(next, prev);
        return { ...b, content: { ...b.content, discussion_themes: next } };
      });
    },
    [persistThemes]
  );

  const handleEditQuestion = useCallback(
    (themeIdx: number, questionIdx: number, next: string) => {
      mutateThemes((themes) => {
        const t = themes[themeIdx];
        if (!t) return themes;
        t.questions = t.questions.map((q, i) => (i === questionIdx ? next : q));
        return themes;
      });
    },
    [mutateThemes]
  );

  const handleDeleteQuestion = useCallback(
    (themeIdx: number, questionIdx: number) => {
      mutateThemes((themes) => {
        const t = themes[themeIdx];
        if (!t) return themes;
        t.questions = t.questions.filter((_, i) => i !== questionIdx);
        return themes;
      });
      showToast("Question removed.");
    },
    [mutateThemes, showToast]
  );

  const handleAddQuestion = useCallback(
    (themeIdx: number) => {
      mutateThemes((themes) => {
        const t = themes[themeIdx];
        if (!t) return themes;
        t.questions = [...t.questions, "New question — click to edit."];
        return themes;
      });
    },
    [mutateThemes]
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (contactLoading) return <ContactLoadingSkeleton />;

  if (contactError) {
    return (
      <PrepError
        message={contactError}
        onRetry={() => { setContactError(null); setContactLoading(true); window.location.reload(); }}
      />
    );
  }

  if (!contact) return null;

  const firstName = contact.name.split(" ")[0];

  if (phase === "intake") {
    return (
      <div className="px-10 pt-8 pb-10 max-w-[840px] mx-auto w-full">
        <PrepIntakeForm
          contact={contact}
          onGenerate={(v) => void handleGenerate(v)}
          onCancel={() => router.push(`/v2/contacts/${contactId}`)}
        />
      </div>
    );
  }

  if (phase === "generating") {
    return <div className="flex-1 flex flex-col"><PrepLoading contactFirstName={firstName} /></div>;
  }

  if (phase === "error") {
    return (
      <PrepError
        message={generationError ?? "An unexpected error occurred."}
        onRetry={() => setPhase("intake")}
      />
    );
  }

  if (!brief) return null;

  return (
    <div className="min-h-full flex flex-col">
      <PrepBriefHeader
        contact={contact}
        intake={brief.intake}
        activeTab={activeTab}
        savedAt={savedAt}
        onTabChange={setActiveTab}
        onBack={() => router.push(`/v2/contacts/${contactId}`)}
        onCopyNotes={handleCopyNotes}
      />

      <div className="flex-1 max-w-[1240px] mx-auto w-full px-10 py-8 flex gap-6">
        <div key={activeTab} className="flex-1 min-w-0 animate-fade-in">
          {activeTab === "snapshot"  && <SnapshotTab content={brief.content} />}
          {activeTab === "company"   && <CompanyTab  content={brief.content} />}
          {activeTab === "agenda"    && <AgendaTab duration={brief.intake.duration} />}
          {activeTab === "questions" && (
            <QuestionsTab
              content={brief.content}
              notes={notes}
              onNoteChange={setNote}
              onEditQuestion={handleEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onAddQuestion={handleAddQuestion}
              savingQuestions={savingQuestions}
            />
          )}
        </div>

        <div className="w-72 flex-shrink-0">
          <LiveNotesPanel
            contactId={contactId}
            contactName={contact.name}
            conversationId={conversationId}
            existingNotes={contact.notes ?? null}
            onSaved={() => {
              const now = new Date();
              setSavedAt(
                `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
              );
              showToast("Notes saved to contact.");
            }}
            onLogged={() => {
              showToast(`Meeting logged to ${firstName}'s profile.`);
              router.push(`/v2/contacts/${contactId}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
