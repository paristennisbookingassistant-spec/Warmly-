"use client";

/**
 * components/v2/onboarding/ReviewStep.tsx
 * Step 2 — Two-column review: "Your background" (inferred from CV) + "Your targets".
 * All fields are pre-filled from ExtractedFields and fully editable.
 */

import { Btn, SectionLabel, Chip } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { Field, SelectInput, TextInput } from "./SelectField";
import { ChipEditor } from "./ChipEditor";
import { GeoSelector } from "./GeoSelector";

// ---- Select option lists ----
const INDUSTRY_OPTIONS = [
  "Management Consulting", "Tech (AI)", "Tech (other)", "Finance",
  "Venture Capital", "Private Equity", "Healthcare / Pharma",
  "Investment Banking", "Consumer / Retail", "Education", "Government", "Other",
];
const FUNCTION_OPTIONS = [
  "Strategy", "Sales", "Marketing", "Product", "Engineering",
  "Operations", "Finance", "GTM", "Business Development", "Other",
];
const NATIONALITY_OPTIONS = [
  "Chinese", "French", "Indian", "American", "German", "British",
  "Brazilian", "Japanese", "Korean", "Spanish", "Italian", "Other",
];
const INSEAD_OPTIONS = [
  "MBA · 26D", "MBA · 26J", "MBA · 25D", "MBA · 25J",
  "MBA · 27D", "MBA · 27J", "MIM · 26", "MIM · 27", "EMBA", "Other",
];
const TARGET_INDUSTRY_OPTIONS = [
  "Tech (AI)", "Tech (other)", "Management Consulting", "Finance",
  "Venture Capital", "Private Equity", "Healthcare / Pharma",
  "Investment Banking", "Consumer / Retail", "Other",
];

const WORK_AUTH_OPTIONS = [
  "EU", "France", "UK", "USA", "Singapore", "UAE", "China",
  "Germany", "Netherlands", "Switzerland",
];

export interface BackgroundState {
  priorIndustry: string;
  priorFunction: string;
  nationality: string;
  workAuth: string[];
  inseadClass: string;
}

export interface TargetState {
  industry: string;
  role: string;
  companies: string[];
  geography: string[];
}

interface ReviewStepProps {
  background: BackgroundState;
  target: TargetState;
  onBgChange: (bg: BackgroundState) => void;
  onTargetChange: (t: TargetState) => void;
  onBack: () => void;
  onSubmit: () => void;
  buildError: string | null;
}

export function ReviewStep({
  background,
  target,
  onBgChange,
  onTargetChange,
  onBack,
  onSubmit,
  buildError,
}: ReviewStepProps) {
  function toggleWorkAuth(c: string) {
    const next = background.workAuth.includes(c)
      ? background.workAuth.filter((x) => x !== c)
      : [...background.workAuth, c];
    onBgChange({ ...background, workAuth: next });
  }

  return (
    <div className="w-full max-w-[960px]">
      <h1
        className="font-display text-[32px] leading-[1.1] mb-2"
        style={{ color: "var(--ink)" }}
      >
        Here&apos;s what we pulled from your CV.
      </h1>
      <p className="text-[14.5px] mb-6" style={{ color: "var(--ink-3)" }}>
        Edit anything that&apos;s off, then tell us where you want to go.
      </p>

      {buildError && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-[13px] flex items-start gap-2"
          style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
        >
          <Icon.Alert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{buildError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* LEFT — background (inferred from CV) */}
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5d8be" }}>
          <div className="mb-1">
            <SectionLabel>Your background</SectionLabel>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] mb-4" style={{ color: "#7a4a25", fontStyle: "italic" }}>
            <Icon.Sparkles size={11} />
            <span>inferred from CV</span>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Prior industry">
              <SelectInput
                value={background.priorIndustry}
                onChange={(v) => onBgChange({ ...background, priorIndustry: v })}
                options={INDUSTRY_OPTIONS}
                placeholder="Select…"
              />
            </Field>
            <Field label="Prior function">
              <SelectInput
                value={background.priorFunction}
                onChange={(v) => onBgChange({ ...background, priorFunction: v })}
                options={FUNCTION_OPTIONS}
                placeholder="Select…"
              />
            </Field>
            <Field label="Nationality">
              <SelectInput
                value={background.nationality}
                onChange={(v) => onBgChange({ ...background, nationality: v })}
                options={NATIONALITY_OPTIONS}
                placeholder="Select…"
              />
            </Field>
            <Field label="Work authorization">
              <div className="flex flex-wrap gap-2">
                {WORK_AUTH_OPTIONS.map((c) => {
                  const sel = background.workAuth.includes(c);
                  return (
                    <Chip
                      key={c}
                      variant={sel ? "selected" : "default"}
                      checked={sel}
                      onClick={() => toggleWorkAuth(c)}
                    >
                      {c}
                    </Chip>
                  );
                })}
              </div>
              {/* Custom work auth chips */}
              <div className="mt-2">
                <ChipEditor
                  values={background.workAuth.filter((v) => !WORK_AUTH_OPTIONS.includes(v))}
                  onChange={(custom) => {
                    const preset = background.workAuth.filter((v) => WORK_AUTH_OPTIONS.includes(v));
                    onBgChange({ ...background, workAuth: [...preset, ...custom] });
                  }}
                  placeholder="+ other"
                />
              </div>
            </Field>
            <Field label="INSEAD class">
              <SelectInput
                value={background.inseadClass}
                onChange={(v) => onBgChange({ ...background, inseadClass: v })}
                options={INSEAD_OPTIONS}
                placeholder="Select…"
              />
            </Field>
          </div>
        </div>

        {/* RIGHT — targets */}
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5d8be" }}>
          <div className="mb-4">
            <SectionLabel>Your targets</SectionLabel>
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Target industry">
              <SelectInput
                value={target.industry}
                onChange={(v) => onTargetChange({ ...target, industry: v })}
                options={TARGET_INDUSTRY_OPTIONS}
                placeholder="Select…"
              />
            </Field>
            <Field label="Target role">
              <TextInput
                value={target.role}
                onChange={(v) => onTargetChange({ ...target, role: v })}
                placeholder="e.g. Product Manager, VC Associate"
              />
            </Field>
            <Field label="Target companies">
              <ChipEditor
                values={target.companies}
                onChange={(companies) => onTargetChange({ ...target, companies })}
                placeholder="+ add company"
              />
            </Field>
            <Field label="Target geography">
              <GeoSelector
                values={target.geography}
                onChange={(geography) => onTargetChange({ ...target, geography })}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Btn variant="ghost" icon={Icon.ArrowLeft} onClick={onBack}>
          Back
        </Btn>
        <Btn size="lg" iconRight={Icon.ArrowRight} onClick={onSubmit}>
          Build my coach
        </Btn>
      </div>
    </div>
  );
}
