"use client";

/**
 * app/v2/onboarding/page.tsx
 * V2 onboarding flow. State machine: upload → processing → review → building → done.
 *
 * API calls:
 *   POST /api/onboarding/parse-cv  (multipart: file + kind)
 *   POST /api/users/me/onboarding-complete  (JSON: materials + targets + goal)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedFields, ParseCvResponse } from "@/types/onboarding";
import { UploadStep } from "@/components/v2/onboarding/UploadStep";
import { ProcessingState } from "@/components/v2/onboarding/ProcessingState";
import { ReviewStep, type BackgroundState, type TargetState } from "@/components/v2/onboarding/ReviewStep";
import { BuildingState } from "@/components/v2/onboarding/BuildingState";
import {
  normaliseExtractedFields,
  type RawExtractedFields,
} from "@/components/v2/onboarding/helpers";
import type { PickedFile } from "@/components/v2/onboarding/DropZone";

// ---- Step indicator ----
function StepBar({ step }: { step: number }) {
  if (step === 3 || step === 4) return null; // hide during building states
  return (
    <div className="flex items-center justify-between px-8 pt-7 shrink-0">
      <div
        className="text-[12px] font-medium"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--ink-3)" }}
      >
        {step} of 2
      </div>
      {/* Placeholder — "Try sample" button removed since we have real data now */}
      <span />
    </div>
  );
}

type Step = "upload" | "processing" | "review" | "building";

function fieldsToBackground(fields: ExtractedFields | null): BackgroundState {
  return {
    priorIndustry: fields?.prior_industry ?? "",
    priorFunction: fields?.prior_function ?? "",
    nationality: fields?.nationality ?? "",
    workAuth: fields?.work_authorization ?? [],
    inseadClass: fields?.insead_class ?? "",
  };
}

function fieldsToTarget(fields: ExtractedFields | null): TargetState {
  return {
    industry: fields?.target_industry ?? "",
    role: fields?.target_role ?? "",
    companies: fields?.target_companies ?? [],
    geography: fields?.target_geography ?? [],
  };
}

function deriveGoal(target: TargetState): string {
  const parts: string[] = [];
  if (target.role) parts.push(`land a ${target.role} role`);
  if (target.industry) parts.push(`in ${target.industry}`);
  if (target.geography.length > 0) parts.push(`based in ${target.geography.slice(0, 2).join(" or ")}`);
  if (target.companies.length > 0) parts.push(`at companies like ${target.companies.slice(0, 2).join(", ")}`);
  if (parts.length === 0) return "Build my professional network and advance my career.";
  return `I want to ${parts.join(" ")}.`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");

  // Upload step state
  const [cvFile, setCvFile] = useState<PickedFile | null>(null);
  const [coverFile, setCoverFile] = useState<PickedFile | null>(null);
  const [assessmentFile, setAssessmentFile] = useState<PickedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pasteFallbackText, setPasteFallbackText] = useState("");

  // Parsed data
  const [parsedCvText, setParsedCvText] = useState("");
  const [parsedCoverText, setParsedCoverText] = useState("");
  const [parsedAssessmentText, setParsedAssessmentText] = useState("");

  // Review step state
  const [background, setBackground] = useState<BackgroundState>(fieldsToBackground(null));
  const [target, setTarget] = useState<TargetState>(fieldsToTarget(null));

  // Build error
  const [buildError, setBuildError] = useState<string | null>(null);

  // ---- Parse the CV via the API ----
  async function parseCv(file: File): Promise<{ text: string; fields: ExtractedFields | null }> {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "cv");
    const res = await fetch("/api/onboarding/parse-cv", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const body = (await res.json()) as ParseCvResponse;
    if (!res.ok || body.error) {
      throw new Error(
        (body.error as { message?: string } | null)?.message ?? "Failed to parse CV"
      );
    }
    return { text: body.data?.text ?? "", fields: body.data?.fields ?? null };
  }

  // ---- Parse an optional file (cover letter / assessment) for its text only ----
  async function parseOptionalFile(file: File, kind: "cover_letter" | "assessment"): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch("/api/onboarding/parse-cv", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) return "";
    const body = (await res.json()) as ParseCvResponse;
    return body.data?.text ?? "";
  }

  // ---- Continue from upload step ----
  async function handleContinue() {
    if (!cvFile) return;
    setParseError(null);
    setStep("processing");
    try {
      const [cvResult, coverText, assessmentText] = await Promise.all([
        parseCv(cvFile.file),
        coverFile ? parseOptionalFile(coverFile.file, "cover_letter") : Promise.resolve(""),
        assessmentFile ? parseOptionalFile(assessmentFile.file, "assessment") : Promise.resolve(""),
      ]);
      setParsedCvText(cvResult.text);
      setParsedCoverText(coverText);
      setParsedAssessmentText(assessmentText);
      const normalised = cvResult.fields
        ? normaliseExtractedFields(cvResult.fields as RawExtractedFields)
        : null;
      setBackground(fieldsToBackground(normalised));
      setTarget(fieldsToTarget(normalised));
      setStep("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read your CV";
      setParseError(msg);
      setShowPasteFallback(true);
      setStep("upload");
    }
  }

  // ---- Paste fallback: user typed CV text manually ----
  function handlePasteContinue() {
    setParsedCvText(pasteFallbackText);
    setBackground(fieldsToBackground(null));
    setTarget(fieldsToTarget(null));
    setStep("review");
  }

  // ---- Submit review step → build profile ----
  async function handleBuild() {
    setBuildError(null);
    setStep("building");
    try {
      const goal = deriveGoal(target);
      const payload = {
        materials: {
          cv: parsedCvText || undefined,
          cover_letter: parsedCoverText || undefined,
          career_assessment: parsedAssessmentText
            ? { text: parsedAssessmentText, kind: "Other" as const }
            : undefined,
          target_preferences: {
            industries: target.industry ? [target.industry] : [],
            companies: target.companies,
            geographies: target.geography,
            roles: target.role ? [target.role] : [],
          },
        },
        goal,
        onboarded: true,
      };
      const res = await fetch("/api/users/me/onboarding-complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { data?: unknown; error?: { message?: string } | null };
      if (!res.ok || body.error) {
        throw new Error(body.error?.message ?? "Could not build your profile");
      }
      router.push("/v2");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setBuildError(msg);
      setStep("review");
    }
  }

  const stepNum = step === "upload" ? 1 : step === "review" ? 2 : 0;

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "#f4ede0" }}
    >
      <StepBar step={stepNum} />
      <div className="flex-1 flex items-center justify-center px-6 pb-8 min-h-0 overflow-y-auto scroll-area">
        {step === "upload" && (
          <UploadStep
            cvFile={cvFile}
            coverFile={coverFile}
            assessmentFile={assessmentFile}
            onCvPick={setCvFile}
            onCvRemove={() => setCvFile(null)}
            onCoverPick={setCoverFile}
            onCoverRemove={() => setCoverFile(null)}
            onAssessmentPick={setAssessmentFile}
            onAssessmentRemove={() => setAssessmentFile(null)}
            onContinue={() => void handleContinue()}
            parseError={parseError}
            showPasteFallback={showPasteFallback}
            pasteFallbackText={pasteFallbackText}
            onPasteFallbackChange={setPasteFallbackText}
            onPasteContinue={handlePasteContinue}
          />
        )}
        {step === "processing" && <ProcessingState />}
        {step === "review" && (
          <ReviewStep
            background={background}
            target={target}
            onBgChange={setBackground}
            onTargetChange={setTarget}
            onBack={() => setStep("upload")}
            onSubmit={() => void handleBuild()}
            buildError={buildError}
          />
        )}
        {step === "building" && <BuildingState />}
      </div>
    </div>
  );
}
