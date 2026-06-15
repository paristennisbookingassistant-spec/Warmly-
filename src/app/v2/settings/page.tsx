"use client";

/**
 * app/v2/settings/page.tsx — V2 Settings (full, Phase 3).
 * Replaces the placeholder. Wires:
 *   GET /api/users/me → name + email for ProfileBlock
 *   useExtensionBridge  → LinkedIn status + re-sync in LinkedInIntegrationBlock
 *   localStorage        → draft language in DraftLanguageBlock
 *   supabase.auth.signOut → SignOutBlock
 */

import { useEffect, useState } from "react";
import { ProfileBlock } from "@/components/v2/settings/ProfileBlock";
import { LinkedInIntegrationBlock } from "@/components/v2/settings/LinkedInIntegrationBlock";
import { DraftLanguageBlock } from "@/components/v2/settings/DraftLanguageBlock";
import { WarmIntrosBlock } from "@/components/v2/settings/WarmIntrosBlock";
import { SignOutBlock } from "@/components/v2/settings/SignOutBlock";
import { SettingsSkeleton } from "@/components/v2/settings/SettingsSkeleton";

interface UserMe {
  name: string;
  email: string;
}

interface UserMeResponse {
  data?: UserMe;
  error?: { message?: string };
}

export default function V2SettingsPage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json() as Promise<UserMeResponse>)
      .then((body) => {
        if (cancelled) return;
        if (body.error) {
          setError(body.error.message ?? "Could not load profile.");
          return;
        }
        setUser(body.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Network error. Try reloading.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-12 pt-12 pb-16 max-w-[820px] mx-auto fade-up">
      <h1 className="font-display text-[36px] leading-[1.05] text-ink mb-8">
        Settings
      </h1>

      {loading ? (
        <SettingsSkeleton />
      ) : error ? (
        <div
          className="rounded-2xl px-6 py-5"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}
        >
          <p className="text-[13.5px] text-ink-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-[12.5px] underline text-ink-3 hover:text-ink transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {user && <ProfileBlock name={user.name} email={user.email} />}
          <LinkedInIntegrationBlock />
          <WarmIntrosBlock />
          <DraftLanguageBlock />
          <SignOutBlock />
        </div>
      )}
    </div>
  );
}
