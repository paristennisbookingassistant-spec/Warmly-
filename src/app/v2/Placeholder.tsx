/**
 * app/v2/Placeholder.tsx
 * Shared "coming in a later phase" panel so the V2 shell is fully navigable
 * during the phased build. Replaced screen-by-screen as each phase lands.
 */

import type { ReactNode } from "react";
import { SectionLabel } from "@/components/v2/primitives";

export default function Placeholder({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="fade-up px-10 pt-10 pb-8 max-w-[1280px] mx-auto w-full">
      <SectionLabel>{eyebrow}</SectionLabel>
      <h1 className="font-display text-[34px] leading-[1.1] text-ink mt-1.5">{title}</h1>
      <p className="text-[14px] text-ink-3 leading-relaxed mt-2 max-w-[560px]">{body}</p>
      {children}
    </div>
  );
}
