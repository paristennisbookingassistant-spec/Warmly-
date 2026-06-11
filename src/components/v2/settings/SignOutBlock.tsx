"use client";

/**
 * components/v2/settings/SignOutBlock.tsx
 * Danger zone card — sign out button.
 */

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SectionLabel, Btn } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

export function SignOutBlock() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="bg-white border rounded-2xl p-7" style={{ borderColor: "#e5d8be" }}>
      <SectionLabel className="mb-3">Session</SectionLabel>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-3 max-w-[400px]">
          Signing out will clear your session. You can sign back in at any time.
        </p>
        <Btn
          variant="ghost"
          size="sm"
          icon={Icon.LogOut}
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Btn>
      </div>
    </div>
  );
}
