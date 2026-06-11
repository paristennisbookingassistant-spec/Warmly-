"use client";

/**
 * components/v2/settings/ProfileBlock.tsx
 * Account / profile card — shows name + email, with optional name edit.
 */

import { useState } from "react";
import { SectionLabel, Btn } from "@/components/v2/primitives";
import { useToast } from "@/components/v2/Toast";

interface ProfileBlockProps {
  name: string;
  email: string;
}

export function ProfileBlock({ name: initialName, email }: ProfileBlockProps) {
  const [name, setName] = useState(initialName);
  // loading/saving state for the name PATCH
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  async function handleSave() {
    if (name.trim() === initialName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Name updated.");
    } catch {
      showToast("Could not update name. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <SectionLabel className="mb-5">Account</SectionLabel>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-[11.5px] font-medium text-ink-3 mb-1.5 uppercase tracking-wide" style={{ letterSpacing: "0.08em" }}>
            Email
          </label>
          <div
            className="h-10 px-3 rounded-lg text-[13.5px] text-ink-3 flex items-center border"
            style={{ background: "#f4ede0", borderColor: "#d9cdb4" }}
          >
            {email}
          </div>
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-ink-3 mb-1.5 uppercase tracking-wide" style={{ letterSpacing: "0.08em" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="focus-ring h-10 w-full px-3 rounded-lg text-[13.5px] text-ink border transition-shadow"
            style={{ borderColor: "#d9cdb4", background: "#ffffff", outline: "none" }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
          />
        </div>
      </div>
      {name.trim() !== initialName.trim() && (
        <div className="flex justify-end mt-4">
          <Btn
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save name"}
          </Btn>
        </div>
      )}
    </div>
  );
}
