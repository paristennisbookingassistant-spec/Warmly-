"use client";

/**
 * components/v2/onboarding/UploadStep.tsx
 * Step 1 — the user uploads their CV (required), and optionally a cover
 * letter and career assessment. On upload the parent triggers the parse call.
 */

import { Btn } from "@/components/v2/primitives";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";
import { DropZone, type PickedFile } from "./DropZone";

interface UploadStepProps {
  cvFile: PickedFile | null;
  coverFile: PickedFile | null;
  assessmentFile: PickedFile | null;
  onCvPick: (f: PickedFile) => void;
  onCvRemove: () => void;
  onCoverPick: (f: PickedFile) => void;
  onCoverRemove: () => void;
  onAssessmentPick: (f: PickedFile) => void;
  onAssessmentRemove: () => void;
  onContinue: () => void;
  parseError: string | null;
  /** If true show "paste fallback" instead of continuing */
  showPasteFallback: boolean;
  pasteFallbackText: string;
  onPasteFallbackChange: (v: string) => void;
  onPasteContinue: () => void;
}

export function UploadStep({
  cvFile,
  coverFile,
  assessmentFile,
  onCvPick,
  onCvRemove,
  onCoverPick,
  onCoverRemove,
  onAssessmentPick,
  onAssessmentRemove,
  onContinue,
  parseError,
  showPasteFallback,
  pasteFallbackText,
  onPasteFallbackChange,
  onPasteContinue,
}: UploadStepProps) {
  return (
    <div className="w-full max-w-[640px]">
      <h1
        className="font-display text-[34px] leading-[1.1] mb-2"
        style={{ color: "var(--ink)" }}
      >
        Let&apos;s build your coach.
      </h1>
      <p className="text-[14.5px] mb-6" style={{ color: "var(--ink-3)" }}>
        Upload your CV and we&apos;ll pull your background automatically.
      </p>

      {showPasteFallback ? (
        <>
          {parseError && (
            <div
              className="rounded-xl px-4 py-3 mb-4 text-[13px] flex items-start gap-2"
              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
            >
              <Icon.Alert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{parseError} — paste your CV text below instead.</span>
            </div>
          )}
          <div className="mb-1">
            <SectionLabel>Paste CV text</SectionLabel>
          </div>
          <textarea
            rows={12}
            value={pasteFallbackText}
            onChange={(e) => onPasteFallbackChange(e.target.value)}
            placeholder="Paste the full text of your CV here…"
            className="focus-ring w-full rounded-xl p-4 text-[13.5px] resize-none transition-shadow"
            style={{
              border: "1px solid var(--line)",
              background: "white",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <div className="mt-4 flex justify-end">
            <Btn
              size="lg"
              disabled={pasteFallbackText.trim().length < 50}
              iconRight={Icon.ArrowRight}
              onClick={onPasteContinue}
            >
              Continue
            </Btn>
          </div>
        </>
      ) : (
        <>
          {parseError && (
            <div
              className="rounded-xl px-4 py-3 mb-4 text-[13px] flex items-start gap-2"
              style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
            >
              <Icon.Alert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{parseError}</span>
            </div>
          )}

          <DropZone
            required
            label="Drop your CV here, or click"
            hint="PDF, .docx, or .txt · Required"
            file={cvFile}
            onPick={onCvPick}
            onRemove={onCvRemove}
            big
          />

          <div className="mt-6 mb-3">
            <SectionLabel>Optional — makes recommendations better</SectionLabel>
          </div>

          <div className="flex flex-col gap-2.5">
            <DropZone
              label="Career assessment"
              hint="CareerLeader, Strengths, etc. Helps match you to people who amplify your strengths."
              file={assessmentFile}
              onPick={onAssessmentPick}
              onRemove={onAssessmentRemove}
            />
            <DropZone
              label="Writing sample / cover letter"
              hint="Cover letters, past emails. We learn your tone so drafts sound like you."
              file={coverFile}
              onPick={onCoverPick}
              onRemove={onCoverRemove}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Btn
              size="lg"
              disabled={!cvFile}
              iconRight={Icon.ArrowRight}
              onClick={onContinue}
            >
              Continue
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}
