"use client";

/**
 * components/v2/prep/QuestionsTab.tsx
 * Tab 3 — Questions: phased question bank from discussion_themes + The Ask + wrap-up.
 */

import { Icon } from "@/components/v2/icons";
import { NoteField } from "./NoteField";
import { QuestionItem } from "./QuestionItem";
import { WrapUpNotes } from "./WrapUpNotes";
import type { MeetingPrepContent, LiveNotes } from "./types";

interface Props {
  content: MeetingPrepContent;
  notes: LiveNotes;
  onNoteChange: (key: string, value: string) => void;
  /** Persist an inline question edit. */
  onEditQuestion: (themeIdx: number, questionIdx: number, next: string) => void;
  /** Delete a question from a theme. */
  onDeleteQuestion: (themeIdx: number, questionIdx: number) => void;
  /** Append a new (empty-ish) question to a theme. */
  onAddQuestion: (themeIdx: number) => void;
  /** True while a persist call is in flight (shows a subtle saving hint). */
  savingQuestions?: boolean;
}

export function QuestionsTab({
  content,
  notes,
  onNoteChange,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
  savingQuestions,
}: Props) {
  const themes = content.discussion_themes ?? [];
  const coaching = content.coaching;

  return (
    <div className="flex flex-col gap-8 fade-up">
      <div className="flex items-center gap-3">
        <div className="font-mono-tag" style={{ color: "var(--ink-3)", letterSpacing: "0.12em" }}>
          Questions
        </div>
        <span className="font-mono-tag" style={{ color: "var(--ink-4)", fontSize: 9.5 }}>
          Edit, delete, or add — saved to this brief
        </span>
        {savingQuestions && (
          <span className="font-mono-tag ml-auto flex items-center gap-1" style={{ color: "#b87a4a", fontSize: 9.5 }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b87a4a" }} />
            Saving…
          </span>
        )}
      </div>

      {/* Pre-meeting notes */}
      <div className="grid grid-cols-2 gap-5">
        <NoteField
          label="Pre-meeting state"
          placeholder="How are you walking in? Tired, curious, prepared…"
          value={notes["preMeeting"] ?? ""}
          onChange={(v) => onNoteChange("preMeeting", v)}
        />
        <NoteField
          label="First impressions"
          placeholder="Vibe in the first 60 seconds — warm, guarded, hurried…"
          value={notes["firstImpressions"] ?? ""}
          onChange={(v) => onNoteChange("firstImpressions", v)}
        />
      </div>

      <div className="h-px" style={{ background: "#e5d8be" }} />

      {/* Discussion themes */}
      {themes.length > 0 ? (
        themes.map((theme, ti) => (
          <div key={ti} className="flex flex-col gap-4">
            <h3
              className="font-mono-tag uppercase"
              style={{ color: "var(--ink-2)", letterSpacing: "0.08em", fontSize: 11.5 }}
            >
              Phase {ti + 1} &middot; {theme.name}
            </h3>
            <div className="h-px" style={{ background: "#e5d8be" }} />
            <div className="flex flex-col gap-5">
              {(theme.questions ?? []).map((q, qi) => (
                <QuestionItem
                  key={qi}
                  themeIdx={ti}
                  questionIdx={qi}
                  text={q}
                  value={notes[`theme-${ti}-q-${qi}`] ?? ""}
                  onChange={(v) => onNoteChange(`theme-${ti}-q-${qi}`, v)}
                  onEditText={(next) => onEditQuestion(ti, qi, next)}
                  onDelete={() => onDeleteQuestion(ti, qi)}
                />
              ))}
              <button
                onClick={() => onAddQuestion(ti)}
                className="self-start inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors ml-[44px] mt-1"
                style={{ color: "var(--ink-3)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#b87a4a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)")}
              >
                <Icon.Plus size={13} />
                Add a question
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>
          No discussion themes generated.
        </p>
      )}

      <div className="h-px" style={{ background: "#e5d8be" }} />

      {/* The Ask */}
      <div className="flex flex-col gap-4">
        <h3
          className="font-mono-tag uppercase"
          style={{ color: "var(--ink-2)", letterSpacing: "0.08em", fontSize: 11.5 }}
        >
          The Ask
        </h3>
        <div className="h-px" style={{ background: "#e5d8be" }} />
        {coaching?.recommended_ask && coaching.recommended_ask !== "none yet" && (
          <div
            className="rounded-xl border px-5 py-4 flex items-start gap-3"
            style={{ borderColor: "#ebcfa0", background: "#fdf6e9" }}
          >
            <Icon.Sparkles size={14} style={{ color: "#b87a4a", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="font-mono-tag mb-1" style={{ color: "#7a4a25", fontSize: 10 }}>
                Recommended ask
              </div>
              <p className="text-[14px] capitalize font-medium" style={{ color: "var(--ink)" }}>
                {coaching.recommended_ask}
              </p>
            </div>
          </div>
        )}
        {coaching?.positioning_advice ? (
          <p className="text-[14px] leading-[1.65]" style={{ color: "var(--ink-2)", maxWidth: 720 }}>
            {coaching.positioning_advice}
          </p>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--ink-4)" }}>No positioning advice.</p>
        )}
      </div>

      <div className="h-px" style={{ background: "#e5d8be" }} />
      <WrapUpNotes notes={notes} onNoteChange={onNoteChange} />
    </div>
  );
}
