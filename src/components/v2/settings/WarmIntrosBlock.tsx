"use client";

/**
 * components/v2/settings/WarmIntrosBlock.tsx
 * Opt-in toggle for the cross-user warm-intro feature.
 *
 * Reads:  GET /api/users/me → data.share_network_for_intros
 * Writes: PATCH /api/users/me { share_network_for_intros: boolean }
 *
 * UX: optimistic toggle, error toast on failure (reverts visual state).
 */

import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/v2/primitives";
import { useToast } from "@/components/v2/Toast";
import { Icon } from "@/components/v2/icons";

interface UserMeResponse {
  data?: { share_network_for_intros?: boolean };
  error?: { message?: string };
}

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-all duration-200 focus:outline-none"
      style={{
        width: 44, height: 24,
        background: checked ? "#b87a4a" : "#d9cdb4",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: "inset 0 1px 2px rgba(31,27,22,0.12)",
      }}
    >
      <span
        className="absolute top-[3px] rounded-full bg-white transition-all duration-200"
        style={{ width: 18, height: 18, left: checked ? 23 : 3, boxShadow: "0 1px 3px rgba(31,27,22,0.18)" }}
      />
    </button>
  );
}

export function WarmIntrosBlock() {
  const showToast = useToast();
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json() as Promise<UserMeResponse>)
      .then((body) => { if (!cancelled) setOptedIn(body.data?.share_network_for_intros ?? false); })
      .catch(() => { if (!cancelled) showToast("Could not load warm-intros setting."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showToast]);

  async function handleToggle(next: boolean) {
    const prev = optedIn;
    setOptedIn(next);
    setPatching(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_network_for_intros: next }),
      });
      if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
      const body = await res.json() as UserMeResponse;
      if (body.error) throw new Error(body.error.message ?? "Update failed");
      showToast(next ? "Warm intros enabled." : "Warm intros disabled.");
    } catch (err) {
      setOptedIn(prev);
      showToast(err instanceof Error ? err.message : "Could not update setting. Try again.");
    } finally {
      setPatching(false);
    }
  }

  if (loading) return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <div className="h-3 w-24 rounded skeleton-pulse mb-5" style={{ background: "var(--line-soft)" }} />
      <div className="h-16 rounded-xl skeleton-pulse" style={{ background: "var(--line-soft)" }} />
    </div>
  );

  return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <SectionLabel className="mb-5">Warm Intros</SectionLabel>
      <div
        className="flex items-start gap-4 p-4 rounded-xl border"
        style={{ borderColor: "#ece2d0", background: "#fbf6ec" }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "#f3e2cd" }}
        >
          <Icon.Network size={18} style={{ color: "#b87a4a" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium text-ink leading-snug">Let peers introduce you</div>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Let Warmly suggest people in your connections&apos; networks to peers
            you&apos;re connected to (and vice-versa). Off by default.
          </p>
          <p
            className="mt-2 text-[11px] leading-relaxed px-2 py-1.5 rounded-lg"
            style={{ background: "var(--bg-sunk)", color: "var(--ink-3)", border: "1px solid var(--line-soft)" }}
          >
            Your network is only matched to opted-in peers. Warmly never exposes your
            full contact list — only individual people relevant to a peer&apos;s stated goal.
          </p>
        </div>
        <Toggle checked={optedIn} onChange={(v) => void handleToggle(v)} disabled={patching} />
      </div>
    </div>
  );
}
