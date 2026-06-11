/**
 * app/v2/page.tsx — V2 Home (scaffold).
 * P0 landing: greeting + entry tiles into Discover and Contacts. The full
 * Home (pick-up-where-you-left-off, lead counts) lands in a later phase.
 */

import Link from "next/link";
import { SectionLabel } from "@/components/v2/primitives";
import { Icon } from "@/components/v2/icons";

const TILES = [
  {
    href: "/v2/discover",
    eyebrow: "Find people",
    title: "Discover",
    body: "Two channels of warm intros: the INSEAD directory and your LinkedIn network. Save or skip, one profile at a time.",
    icon: Icon.Compass,
  },
  {
    href: "/v2/contacts",
    eyebrow: "Your network",
    title: "Contacts",
    body: "Everyone you've saved, with status, follow-ups, and the story so far for each relationship.",
    icon: Icon.Users,
  },
];

export default function V2HomePage() {
  return (
    <div className="fade-up px-10 pt-10 pb-8 max-w-[1280px] mx-auto w-full">
      <SectionLabel>Home</SectionLabel>
      <h1 className="font-display text-[38px] leading-[1.05] text-ink mt-1.5">Welcome back.</h1>
      <p className="text-[14px] text-ink-3 leading-relaxed mt-2 max-w-[560px]">
        Pick a channel and start screening warm intros, or revisit the contacts you&rsquo;ve saved.
      </p>

      <div className="grid grid-cols-2 gap-5 mt-8 max-w-[840px]">
        {TILES.map((t) => {
          const IconCmp = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group bg-surface rounded-2xl p-6 shadow-soft card-hover transition-all"
              style={{ border: "1px solid var(--line)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                <IconCmp size={20} />
              </div>
              <SectionLabel>{t.eyebrow}</SectionLabel>
              <div className="font-display text-[24px] text-ink leading-tight mt-1 flex items-center gap-2">
                {t.title}
                <Icon.ArrowRight
                  size={16}
                  className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                />
              </div>
              <p className="text-[13px] text-ink-3 leading-relaxed mt-2">{t.body}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
