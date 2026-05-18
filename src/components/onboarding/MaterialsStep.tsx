"use client";

/**
 * MaterialsStep — the new "What can you share to help me know you?" step
 * in onboarding. Five optional toggle cards:
 *
 *   1. CV text          → feeds profile_md
 *   2. Past messages    → feeds voice_md
 *   3. Target           → fills users.goals.target_*
 *   4. Career assessment → feeds profile_md (with kind label)
 *   5. Cover letter     → feeds voice_md
 *
 * All optional. User can skip the step entirely. Each card starts
 * collapsed; toggling it ON reveals the input.
 *
 * v1: text input only (no file upload). PDF/DOCX parsing is a
 * follow-up enhancement.
 */

import { useState } from "react";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CareerAssessmentKind =
  | "CareerLeader"
  | "MBTI"
  | "Hogan"
  | "DISC"
  | "Other";

export interface MaterialsData {
  cv?: string;
  past_messages?: string;
  cover_letter?: string;
  career_assessment?: { text: string; kind: CareerAssessmentKind };
  target_preferences?: {
    industries?: string[];
    companies?: string[];
    geographies?: string[];
    roles?: string[];
  };
}

interface MaterialsStepProps {
  onSubmit: (data: MaterialsData) => void;
  onSkip: () => void;
}

// ---------------------------------------------------------------------------
// Card config
// ---------------------------------------------------------------------------

type CardKey =
  | "cv"
  | "past_messages"
  | "targets"
  | "career_assessment"
  | "cover_letter";

const CARDS: Array<{
  key: CardKey;
  title: string;
  description: string;
  signal: "identity" | "voice" | "targets";
}> = [
  {
    key: "cv",
    title: "Your CV",
    description: "Paste your CV. I'll extract your career story and use it to ground every draft.",
    signal: "identity",
  },
  {
    key: "past_messages",
    title: "Past message samples",
    description: "Paste 2-3 LinkedIn DMs or emails you've sent. This is the strongest signal for matching your voice.",
    signal: "voice",
  },
  {
    key: "targets",
    title: "Where you're trying to go",
    description: "Industries, companies, geographies, role types. Used to filter discovery.",
    signal: "targets",
  },
  {
    key: "career_assessment",
    title: "Career assessment",
    description: "CareerLeader, MBTI, Hogan, DISC — anything that tells me how you think and what you're good at.",
    signal: "identity",
  },
  {
    key: "cover_letter",
    title: "Cover letter or bio samples",
    description: "Formal writing you've polished. Helps me match your tone when drafting.",
    signal: "voice",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaterialsStep({ onSubmit, onSkip }: MaterialsStepProps) {
  // Which cards are toggled on
  const [enabled, setEnabled] = useState<Record<CardKey, boolean>>({
    cv: false,
    past_messages: false,
    targets: false,
    career_assessment: false,
    cover_letter: false,
  });

  // Per-card data
  const [cvText, setCvText] = useState("");
  const [pastMessages, setPastMessages] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [assessmentKind, setAssessmentKind] = useState<CareerAssessmentKind>("CareerLeader");
  const [industries, setIndustries] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [geographies, setGeographies] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  function toggle(key: CardKey) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function buildPayload(): MaterialsData {
    const out: MaterialsData = {};
    if (enabled.cv && cvText.trim()) out.cv = cvText.trim();
    if (enabled.past_messages && pastMessages.trim())
      out.past_messages = pastMessages.trim();
    if (enabled.cover_letter && coverLetter.trim())
      out.cover_letter = coverLetter.trim();
    if (enabled.career_assessment && assessmentText.trim()) {
      out.career_assessment = {
        text: assessmentText.trim(),
        kind: assessmentKind,
      };
    }
    if (enabled.targets) {
      const t: NonNullable<MaterialsData["target_preferences"]> = {};
      if (industries.length) t.industries = industries;
      if (companies.length) t.companies = companies;
      if (geographies.length) t.geographies = geographies;
      if (roles.length) t.roles = roles;
      if (Object.keys(t).length > 0) out.target_preferences = t;
    }
    return out;
  }

  const anyEnabled = Object.values(enabled).some(Boolean);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {CARDS.map((card) => {
          const isOn = enabled[card.key];
          return (
            <div
              key={card.key}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                background: isOn
                  ? "color-mix(in oklch, var(--accent) 8%, var(--surface))"
                  : "var(--surface)",
                border: isOn ? "1px solid var(--accent)" : "1px solid var(--line)",
              }}
            >
              <button
                onClick={() => toggle(card.key)}
                className="w-full text-left px-4 py-3 flex items-start gap-3"
              >
                <div
                  className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                  style={{
                    borderColor: isOn ? "var(--accent)" : "var(--line-strong)",
                    background: isOn ? "var(--accent)" : "transparent",
                  }}
                >
                  {isOn && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className="font-medium text-[13.5px] mb-0.5 flex items-center gap-2"
                    style={{ color: "var(--ink)" }}
                  >
                    {card.title}
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background:
                          card.signal === "voice"
                            ? "color-mix(in oklch, var(--accent) 14%, transparent)"
                            : card.signal === "identity"
                            ? "color-mix(in oklch, var(--ink) 8%, transparent)"
                            : "color-mix(in oklch, var(--ink-2) 8%, transparent)",
                        color: "var(--ink-2)",
                      }}
                    >
                      {card.signal === "voice"
                        ? "voice"
                        : card.signal === "identity"
                        ? "identity"
                        : "targets"}
                    </span>
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
                    {card.description}
                  </div>
                </div>
              </button>

              {isOn && (
                <div className="px-4 pb-4 space-y-2">
                  {card.key === "cv" && (
                    <textarea
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      placeholder="Paste your CV here. Plain text is fine — I'll extract the structure."
                      className="w-full min-h-[140px] px-3 py-2 rounded-md text-[13px] resize-y"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  )}

                  {card.key === "past_messages" && (
                    <textarea
                      value={pastMessages}
                      onChange={(e) => setPastMessages(e.target.value)}
                      placeholder={
                        "Paste 2-3 messages you've sent on LinkedIn or in emails. Separate them with a blank line.\n\nExample:\n\nHi Sarah, thanks for the intro to ...\n\nHey Marc, I saw your post on ..."
                      }
                      className="w-full min-h-[160px] px-3 py-2 rounded-md text-[13px] resize-y"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  )}

                  {card.key === "cover_letter" && (
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Paste a cover letter or bio paragraph you wrote yourself."
                      className="w-full min-h-[140px] px-3 py-2 rounded-md text-[13px] resize-y"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  )}

                  {card.key === "career_assessment" && (
                    <>
                      <div className="flex gap-2 items-center">
                        <label
                          className="text-[11px] font-medium"
                          style={{ color: "var(--ink-2)" }}
                        >
                          Type:
                        </label>
                        <select
                          value={assessmentKind}
                          onChange={(e) =>
                            setAssessmentKind(e.target.value as CareerAssessmentKind)
                          }
                          className="text-[12.5px] px-2 py-1 rounded-md"
                          style={{
                            background: "var(--bg)",
                            border: "1px solid var(--line)",
                            color: "var(--ink)",
                          }}
                        >
                          <option value="CareerLeader">CareerLeader</option>
                          <option value="MBTI">MBTI</option>
                          <option value="Hogan">Hogan</option>
                          <option value="DISC">DISC</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <textarea
                        value={assessmentText}
                        onChange={(e) => setAssessmentText(e.target.value)}
                        placeholder="Paste your assessment results. Top strengths, themes, recommended roles — whatever you have."
                        className="w-full min-h-[140px] px-3 py-2 rounded-md text-[13px] resize-y"
                        style={{
                          background: "var(--bg)",
                          border: "1px solid var(--line)",
                          color: "var(--ink)",
                        }}
                      />
                    </>
                  )}

                  {card.key === "targets" && (
                    <div className="space-y-2">
                      <TagInput
                        label="Target industries"
                        placeholder="e.g. private equity, growth VC, AI infrastructure"
                        value={industries}
                        onChange={setIndustries}
                      />
                      <TagInput
                        label="Target companies"
                        placeholder="e.g. Sequoia, Bain Capital, Stripe"
                        value={companies}
                        onChange={setCompanies}
                      />
                      <TagInput
                        label="Target geographies"
                        placeholder="e.g. Paris, London, Singapore"
                        value={geographies}
                        onChange={setGeographies}
                      />
                      <TagInput
                        label="Target roles"
                        placeholder="e.g. investor, founder, strategy lead"
                        value={roles}
                        onChange={setRoles}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSkip}
          className="px-3 py-1.5 rounded-md text-[12px]"
          style={{ color: "var(--ink-3)" }}
        >
          Skip this step
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onSubmit(buildPayload())}
          disabled={!anyEnabled}
          className="px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagInput — comma-separated chips with backspace-to-delete
// ---------------------------------------------------------------------------

interface TagInputProps {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (next: string[]) => void;
}

function TagInput({ label, placeholder, value, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <label
        className="block text-[11px] font-medium mb-1"
        style={{ color: "var(--ink-2)" }}
      >
        {label}
      </label>
      <div
        className="rounded-md px-2 py-1.5 min-h-[36px] flex flex-wrap gap-1.5 items-center"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
        }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px]"
            style={{
              background: "color-mix(in oklch, var(--accent) 14%, transparent)",
              color: "var(--ink)",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] outline-none text-[12.5px] bg-transparent"
          style={{ color: "var(--ink)" }}
        />
      </div>
    </div>
  );
}
