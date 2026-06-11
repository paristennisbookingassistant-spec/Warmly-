/**
 * components/v2/home/FirstRunState.tsx
 * Empty / first-run CTA pointing the user to Discover.
 * Shown when no contacts are saved yet.
 */

import Link from "next/link";
import { Icon } from "@/components/v2/icons";

export function FirstRunState() {
  return (
    <div
      className="w-full rounded-2xl px-8 py-10 flex flex-col items-center text-center border"
      style={{ borderColor: "#e5d8be", background: "#fbf6ec" }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "#f3e2cd", color: "#b87a4a" }}
      >
        <Icon.Compass size={24} />
      </div>
      <h3 className="font-display text-[22px] text-ink mb-2">Your pipeline is empty</h3>
      <p className="text-[14px] text-ink-3 max-w-[360px] leading-relaxed mb-6">
        Start discovering warm leads from the INSEAD directory and your LinkedIn network.
        Your coach will find relevant people and surface them here.
      </p>
      <Link
        href="/v2/discover"
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[13.5px] font-medium transition-all hover:scale-[1.02]"
        style={{ background: "#5e8d6a", color: "#ffffff", textDecoration: "none" }}
      >
        <Icon.Compass size={16} />
        Start discovery
        <Icon.ArrowRight size={14} />
      </Link>
    </div>
  );
}
