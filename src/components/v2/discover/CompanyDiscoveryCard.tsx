"use client";

/**
 * components/v2/discover/CompanyDiscoveryCard.tsx
 * Module 3 — Validate-criteria card + connect-extension state.
 *
 * Shown as an inline card below the Doors grid when the user clicks
 * "Discover at a company". Collects company + optional location/function,
 * then calls onFind. Handles no_extension, error, company picker states.
 */

import { useRef, useState } from "react";
import { Icon } from "../icons";
import type { CompanyCandidate, DiscoveryPhase } from "./useCompanyDiscovery";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompanyDiscoveryCardProps {
  /** Called with the validated criteria when user clicks "Find them" */
  onFind: (params: {
    companyName: string;
    hint?: string;
    locationLabel?: string;
    functionLabel?: string;
  }) => void;
  /** Called when user picks a candidate from the company picker */
  onPickCandidate: (candidate: CompanyCandidate) => void;
  /** Called when the card is dismissed */
  onDismiss: () => void;
  phase: DiscoveryPhase;
  errorMessage: string | null;
  candidates: CompanyCandidate[] | null;
}

// ---------------------------------------------------------------------------
// CompanyDiscoveryCard
// ---------------------------------------------------------------------------

export function CompanyDiscoveryCard({
  onFind,
  onPickCandidate,
  onDismiss,
  phase,
  errorMessage,
  candidates,
}: CompanyDiscoveryCardProps) {
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [fn, setFn] = useState("");
  const companyRef = useRef<HTMLInputElement>(null);

  const isSubmitting = phase === "detecting" || phase === "creating_session";
  const showConnectState = phase === "no_extension";
  const showPicker = phase === "error" && candidates && candidates.length > 0;
  const showGenericError =
    phase === "error" && (!candidates || candidates.length === 0) && errorMessage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = company.trim();
    if (!trimmed) {
      companyRef.current?.focus();
      return;
    }
    onFind({
      companyName: trimmed,
      hint: trimmed,
      locationLabel: location.trim() || undefined,
      functionLabel: fn.trim() || undefined,
    });
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden mt-5 fade-up"
      style={{
        borderColor: "#e5d8be",
        background: "#fffdf9",
        boxShadow: "0 1px 0 rgba(31,27,22,0.04), 0 4px 16px rgba(31,27,22,0.06)",
      }}
    >
      {/* Header strip */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#ece2d0" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#dde6ee", color: "#4a6f87" }}
          >
            <Icon.Search size={14} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink leading-tight">
              Discover alumni at a company
            </div>
            <div className="text-[11px] text-ink-4 mt-0.5">
              Live LinkedIn search · INSEAD alumni only · read-only
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-white transition-all"
          aria-label="Dismiss"
        >
          <Icon.X size={14} />
        </button>
      </div>

      {/* Connect-extension state */}
      {showConnectState && (
        <ConnectExtensionState onDismiss={onDismiss} />
      )}

      {/* Company picker state */}
      {showPicker && candidates && (
        <CompanyPickerState
          candidates={candidates}
          onPick={onPickCandidate}
        />
      )}

      {/* Generic error */}
      {showGenericError && (
        <div className="px-6 py-4 flex items-start gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "#fee2e2", color: "#ef4444" }}
          >
            <Icon.Alert size={12} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-ink">{errorMessage}</div>
            <button
              onClick={onDismiss}
              className="text-[12px] mt-2 underline"
              style={{ color: "#4a6f87" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main form — shown in idle / creating / detecting phases */}
      {!showConnectState && !showPicker && !showGenericError && (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Criteria fields */}
          <div className="grid grid-cols-3 gap-3">
            <FieldGroup label="Company" required>
              <input
                ref={companyRef}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. McKinsey"
                className="w-full h-9 px-3 text-[13px] text-ink rounded-lg border outline-none transition-all placeholder:text-ink-4"
                style={{
                  borderColor: "#d9cdb4",
                  background: "#ffffff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4a6f87";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(74,111,135,0.14)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d9cdb4";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </FieldGroup>

            <FieldGroup label="Location" hint="optional">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Paris"
                className="w-full h-9 px-3 text-[13px] text-ink rounded-lg border outline-none transition-all placeholder:text-ink-4"
                style={{
                  borderColor: "#d9cdb4",
                  background: "#ffffff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4a6f87";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(74,111,135,0.14)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d9cdb4";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={isSubmitting}
              />
            </FieldGroup>

            <FieldGroup label="Function" hint="optional">
              <input
                value={fn}
                onChange={(e) => setFn(e.target.value)}
                placeholder="e.g. Finance"
                className="w-full h-9 px-3 text-[13px] text-ink rounded-lg border outline-none transition-all placeholder:text-ink-4"
                style={{
                  borderColor: "#d9cdb4",
                  background: "#ffffff",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#4a6f87";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(74,111,135,0.14)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d9cdb4";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={isSubmitting}
              />
            </FieldGroup>
          </div>

          {/* School badge — always INSEAD, non-editable */}
          <div className="flex items-center gap-2">
            <span className="font-mono-tag text-ink-4" style={{ fontSize: 9 }}>
              School
            </span>
            <span
              className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-medium font-mono"
              style={{ background: "#f3e2cd", color: "#7a4a25", letterSpacing: "0.04em" }}
            >
              INSEAD
            </span>
            <span className="text-[11px] text-ink-4">
              · alumni only · max 25 profiles · read-only
            </span>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !company.trim()}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: isSubmitting || !company.trim() ? "#ece2d0" : "#4a6f87",
                color: isSubmitting || !company.trim() ? "#8e8170" : "#ffffff",
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="inline-block w-[14px] h-[14px] rounded-full border-2 border-white border-t-transparent animate-spin"
                  />
                  {phase === "detecting" ? "Checking extension…" : "Starting…"}
                </>
              ) : (
                <>
                  <Icon.Search size={13} />
                  Find them
                </>
              )}
            </button>
            <span className="text-[11px] text-ink-4">
              Extension must be installed + LinkedIn open
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectExtensionState
// ---------------------------------------------------------------------------

function ConnectExtensionState({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="px-6 py-6 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "#ece2d0", color: "#7a4a25" }}
      >
        <Icon.Link size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-ink mb-1">
          Connect the Warmly extension to run live discovery
        </div>
        <p className="text-[12.5px] text-ink-3 leading-relaxed mb-4">
          The Chrome extension scrapes LinkedIn alumni pages in the background.
          Install it, open LinkedIn in another tab, and come back here.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "#4a6f87", color: "#ffffff" }}
          >
            Get the extension
            <Icon.ArrowRight size={13} />
          </a>
          <button
            onClick={onDismiss}
            className="text-[12.5px] text-ink-3 hover:text-ink transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompanyPickerState
// ---------------------------------------------------------------------------

function CompanyPickerState({
  candidates,
  onPick,
}: {
  candidates: CompanyCandidate[];
  onPick: (c: CompanyCandidate) => void;
}) {
  return (
    <div className="px-6 py-5">
      <div className="text-[12.5px] text-ink-3 mb-3">
        Multiple companies matched — pick the right one:
      </div>
      <div className="flex flex-col gap-2">
        {candidates.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:border-blue-400"
            style={{ borderColor: "#d9cdb4", background: "#ffffff" }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "#dde6ee", color: "#4a6f87" }}
            >
              <Icon.Briefcase size={13} />
            </div>
            <span className="text-[13px] font-medium text-ink">{c.companyName}</span>
            <Icon.ChevronRight size={13} className="ml-auto text-ink-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldGroup
// ---------------------------------------------------------------------------

function FieldGroup({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5">
        <span className="font-mono-tag text-ink-3" style={{ fontSize: 9.5 }}>
          {label}
        </span>
        {required && (
          <span style={{ color: "#ef4444", fontSize: 10 }}>*</span>
        )}
        {hint && (
          <span className="text-ink-4" style={{ fontSize: 9.5 }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
