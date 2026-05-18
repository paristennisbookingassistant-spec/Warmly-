"use client";

import { useState, useEffect, useCallback } from "react";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  profile_md: string | null;
  voice_md: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [name, setName] = useState("");
  const [profileMd, setProfileMd] = useState("");
  const [voiceMd, setVoiceMd] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me", { credentials: "include" })
      .then((r) => r.json())
      .then((body: { data?: UserData | null }) => {
        if (cancelled) return;
        const d = body.data;
        if (!d) { setFetchError(true); return; }
        setData(d);
        setName(d.name ?? "");
        setProfileMd(d.profile_md ?? "");
        setVoiceMd(d.voice_md ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const isDirty =
    data !== null &&
    (name !== (data.name ?? "") ||
      profileMd !== (data.profile_md ?? "") ||
      voiceMd !== (data.voice_md ?? ""));

  const handleSave = useCallback(async () => {
    if (!data || !isDirty) return;
    setSaveStatus("saving");
    setSaveError(null);

    const patch: Partial<Pick<UserData, "name" | "profile_md" | "voice_md">> = {};
    if (name !== (data.name ?? "")) patch.name = name;
    if (profileMd !== (data.profile_md ?? "")) patch.profile_md = profileMd;
    if (voiceMd !== (data.voice_md ?? "")) patch.voice_md = voiceMd;

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData((prev) => prev ? { ...prev, ...patch } : prev);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
      setTimeout(() => { setSaveStatus("idle"); setSaveError(null); }, 4000);
    }
  }, [data, isDirty, name, profileMd, voiceMd]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full text-[14px]"
        style={{ color: "var(--ink-3)" }}
      >
        Loading...
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex items-center justify-center h-full text-[14px]" style={{ color: "var(--bad)" }}>
        Could not load your settings. Try reloading the page.
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-[13px] border outline-none transition-colors duration-150 focus:ring-2";

  return (
    <div
      className="h-full overflow-y-auto px-8 py-10"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-[640px] mx-auto flex flex-col gap-8">
        {/* Page title */}
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase mb-1" style={{ color: "var(--ink-3)" }}>
            Account
          </p>
          <h1
            className="font-display italic text-[40px] leading-[1.05] tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Settings
          </h1>
        </div>

        {/* Email (readonly) */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-3)" }}>
            Account email
          </p>
          <p
            className="text-[13px] px-3 py-2 rounded-lg border"
            style={{
              color: "var(--ink-3)",
              background: "var(--bg-sunk)",
              borderColor: "var(--line)",
            }}
          >
            {data.email}
          </p>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-3)" }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            style={{
              color: "var(--ink)",
              background: "var(--surface)",
              borderColor: "var(--line)",
            }}
          />
        </div>

        {/* profile_md */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-3)" }}>
            Who you are
          </label>
          <textarea
            rows={12}
            value={profileMd}
            onChange={(e) => setProfileMd(e.target.value)}
            className={inputClass}
            style={{
              color: "var(--ink)",
              background: "var(--surface)",
              borderColor: "var(--line)",
              resize: "vertical",
            }}
          />
          <p className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
            Context the coach uses to score contacts and draft outreach. Edit as your story evolves.
          </p>
        </div>

        {/* voice_md */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--ink-3)" }}>
            Your voice
          </label>
          <textarea
            rows={6}
            value={voiceMd}
            onChange={(e) => setVoiceMd(e.target.value)}
            className={inputClass}
            style={{
              color: "var(--ink)",
              background: "var(--surface)",
              borderColor: "var(--line)",
              resize: "vertical",
            }}
          />
          <p className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
            Tone and style for drafted messages.
          </p>
        </div>

        {/* Save row */}
        <div className="flex items-center gap-3 pb-10">
          <button
            onClick={handleSave}
            disabled={!isDirty || saveStatus === "saving"}
            className="rounded-lg px-6 py-3 text-[13px] font-medium transition-all duration-150"
            style={{
              background: "var(--accent)",
              color: "#fff",
              opacity: !isDirty || saveStatus === "saving" ? 0.5 : 1,
              cursor: !isDirty || saveStatus === "saving" ? "not-allowed" : "pointer",
            }}
          >
            {saveStatus === "saving" ? "Saving..." : "Save changes"}
          </button>

          {saveStatus === "saved" && (
            <span
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "var(--good)", color: "#fff" }}
            >
              Saved
            </span>
          )}
          {saveStatus === "error" && saveError && (
            <span
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "var(--bad)", color: "#fff" }}
            >
              {saveError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
