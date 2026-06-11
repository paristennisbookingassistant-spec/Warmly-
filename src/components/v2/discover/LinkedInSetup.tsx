"use client";

/**
 * components/v2/discover/LinkedInSetup.tsx
 * 3-step LinkedIn channel setup checklist.
 * Step 1/2 use local boolean state (extension wiring is optional in P1).
 * Step 3 scope chips are editable local state.
 * Ported from design/warmly-v2/project/js/screens/discover.jsx.
 */

import { useState } from "react";
import { CHANNELS } from "../palette";
import { Icon } from "../icons";
import { Btn, Chip } from "../primitives";

// ---------- Seed scope (from user profile) ----------
const SEED_ROLES = ["Product Manager"];
const SEED_COMPANIES: string[] = [];
const SEED_GEOS = ["Paris", "Berlin"];

// ---------- LinkedInSetup ----------

interface LinkedInSetupProps {
  onDone: () => void;
  onBack: () => void;
}

export function LinkedInSetup({ onDone, onBack }: LinkedInSetupProps) {
  const [extInstalled, setExtInstalled] = useState(false);
  const [liSignedIn, setLiSignedIn] = useState(false);
  const [scopeRoles, setScopeRoles] = useState<string[]>(SEED_ROLES);
  const [scopeCompanies, setScopeCompanies] = useState<string[]>(SEED_COMPANIES);
  const [scopeGeos, setScopeGeos] = useState<string[]>(SEED_GEOS);

  const scopeReady = scopeRoles.length > 0 && scopeGeos.length > 0;
  const allDone = extInstalled && liSignedIn && scopeReady;
  const c = CHANNELS.linkedin;

  return (
    <div className="fade-up max-w-[760px] mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors mb-7"
      >
        <Icon.ArrowLeft size={14} />
        Back to doors
      </button>

      <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono-tag mb-2" style={{ color: c.accent }}>
            Door 2 · Setup
          </div>
          <h1
            className="font-display text-[32px] leading-[1.1] text-ink mb-2"
            style={{ fontStyle: "italic" }}
          >
            Connect the LinkedIn channel.
          </h1>
          <p className="text-[14.5px] text-ink-3 leading-relaxed max-w-[540px]">
            Three quick steps. After this, the coach will surface 1st-degree connections from your
            synced LinkedIn account.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v2/linkedin-logo.png" alt="LinkedIn" className="h-8 w-auto object-contain" />
      </div>

      <div className="flex flex-col gap-4">
        <SetupStep
          n={1}
          done={extInstalled}
          title="Install the Warmly Chrome extension"
          body="The extension reads your visible LinkedIn connections locally. Nothing leaves your browser until you save a contact."
          action={
            extInstalled ? (
              <DoneTag text="Installed" />
            ) : (
              <Btn size="sm" onClick={() => setExtInstalled(true)} icon={Icon.Plus}>
                Add to Chrome
              </Btn>
            )
          }
        />

        <SetupStep
          n={2}
          done={liSignedIn}
          locked={!extInstalled}
          title="Connect your LinkedIn"
          body={
            liSignedIn
              ? "Connected. Warmly is syncing your LinkedIn connections; your session stays local and no credentials are stored."
              : "Sign in and connect your LinkedIn so Warmly can sync your connections and surface 1st-degree contacts. Your session is read locally."
          }
          action={
            liSignedIn ? (
              <DoneTag text="Connected" />
            ) : (
              <Btn
                size="sm"
                variant="secondary"
                disabled={!extInstalled}
                onClick={() => setLiSignedIn(true)}
                icon={Icon.Link}
              >
                Connect LinkedIn
              </Btn>
            )
          }
        />

        <SetupStep
          n={3}
          done={scopeReady && extInstalled && liSignedIn}
          locked={!liSignedIn}
          title="Confirm the discovery scope"
          body="Defaults pulled from your Warmly profile. Edit to narrow or widen the net."
        >
          <div className="flex flex-col gap-4 mt-3">
            <ScopeRow label="Roles" chips={scopeRoles} setChips={setScopeRoles} placeholder="+ Add role" />
            <ScopeRow label="Companies" chips={scopeCompanies} setChips={setScopeCompanies} placeholder="+ Add company" />
            <ScopeRow label="Geography" chips={scopeGeos} setChips={setScopeGeos} placeholder="+ Add city / country" />
            <div className="text-[11.5px] text-ink-4 italic">
              Tip: leave a field empty to widen the search across all values.
            </div>
          </div>
        </SetupStep>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-[12.5px] text-ink-3">
          {allDone ? "Ready to start." : "Complete all 3 steps to start discovery."}
        </div>
        <Btn size="lg" disabled={!allDone} onClick={onDone} iconRight={Icon.ArrowRight}>
          Start discovery
        </Btn>
      </div>
    </div>
  );
}

// ---------- SetupStep ----------

interface SetupStepProps {
  n: number;
  done: boolean;
  locked?: boolean;
  title: string;
  body?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

function SetupStep({ n, done, locked, title, body, action, children }: SetupStepProps) {
  const c = CHANNELS.linkedin;
  return (
    <div
      className="rounded-2xl border p-5 transition-opacity"
      style={{
        background: "#ffffff",
        borderColor: done ? c.accent : "#e5d8be",
        opacity: locked ? 0.55 : 1,
        boxShadow: done ? `0 0 0 1px ${c.accent} inset` : "none",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold"
          style={{
            background: done ? c.accent : c.soft,
            color: done ? "#ffffff" : c.ink,
          }}
        >
          {done ? <Icon.Check size={14} /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[14.5px] font-semibold text-ink leading-tight">{title}</div>
            {action}
          </div>
          {body && (
            <div className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">{body}</div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function DoneTag({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[24px] rounded-full text-[11.5px] font-medium"
      style={{ background: "#dcebd9", color: "#34553e" }}
    >
      <Icon.Check size={11} />
      {text}
    </span>
  );
}

// ---------- ScopeRow ----------

interface ScopeRowProps {
  label: string;
  chips: string[];
  setChips: (chips: string[]) => void;
  placeholder: string;
}

function ScopeRow({ label, chips, setChips, placeholder }: ScopeRowProps) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");

  const commit = () => {
    const v = val.trim();
    if (v && !chips.includes(v)) setChips([...chips, v]);
    setVal("");
    setAdding(false);
  };

  return (
    <div>
      <div className="font-mono-tag text-ink-4 mb-2" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((c) => (
          <Chip
            key={c}
            variant="selected"
            removable
            onRemove={() => setChips(chips.filter((x) => x !== c))}
          >
            {c}
          </Chip>
        ))}
        {adding ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setVal("");
                setAdding(false);
              }
            }}
            placeholder={placeholder}
            className="h-8 px-3 rounded-full text-[12.5px] border bg-white focus-ring outline-none"
            style={{ borderColor: "#d9cdb4", minWidth: 140 }}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)}>
            <Chip variant="add">{placeholder}</Chip>
          </button>
        )}
      </div>
    </div>
  );
}
