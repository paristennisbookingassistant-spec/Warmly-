/**
 * components/v2/primitives.tsx
 * Stateless UI primitives for the V2 app, ported from the design bundle
 * (design/warmly-v2/project/js/shared.jsx). Warm-editorial styling using the
 * globals.css design tokens; channel/tier literals come from ./palette.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconProps } from "./icons";
import { TIER_STYLES, type Tier } from "./palette";
import { AvatarImg } from "./AvatarImg";

type IconType = (props: IconProps) => ReactNode;

// ---------- Wordmark ----------
export function Wordmark({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span
      className="inline-flex items-baseline gap-[3px] select-none leading-none font-display"
      style={{ fontSize: size, color: dark ? "var(--ink)" : "var(--sidebar-ink)" }}
    >
      <span>Warmly</span>
      <span
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: "var(--accent)", transform: "translateY(-1px)" }}
      />
    </span>
  );
}

// ---------- Button ----------
type BtnVariant = "primary" | "secondary" | "ghost" | "dark" | "sienna-soft";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconType;
  iconRight?: IconType;
  children?: ReactNode;
}

const BTN_SIZES: Record<BtnSize, string> = {
  sm: "h-8 px-3 text-[12.5px] rounded-md",
  md: "h-10 px-4 text-[13.5px] rounded-lg",
  lg: "h-11 px-5 text-[14px] rounded-lg",
};

function btnVariantStyle(variant: BtnVariant): React.CSSProperties {
  switch (variant) {
    case "primary":
      return { background: "var(--accent)", color: "#fff" };
    case "secondary":
      return { background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--line-soft)" };
    case "ghost":
      return { background: "transparent", color: "var(--ink-2)" };
    case "dark":
      return { background: "var(--ink)", color: "var(--bg)" };
    case "sienna-soft":
      return { background: "#f3e2cd", color: "#7a4a25" };
  }
}

export function Btn({
  variant = "primary",
  size = "md",
  icon: IconCmp,
  iconRight: IconRight,
  className = "",
  disabled,
  children,
  ...rest
}: BtnProps) {
  const iconSize = size === "sm" ? 14 : 15;
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 select-none ${BTN_SIZES[size]} ${className}`}
      style={{ ...btnVariantStyle(variant), opacity: disabled ? 0.5 : 1 }}
      {...rest}
    >
      {IconCmp && <IconCmp size={iconSize} />}
      {children}
      {IconRight && <IconRight size={iconSize} />}
    </button>
  );
}

// ---------- Tier badge ----------
export function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLES[tier] ?? TIER_STYLES.Adjacent;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="inline-block w-[7px] h-[7px] rounded-full" style={{ background: s.dot }} />
      {tier}
    </span>
  );
}

// ---------- INSEAD pill (mono class tag) ----------
export function InseadPill({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-medium font-mono"
      style={{ background: "#f3e2cd", color: "#7a4a25", letterSpacing: "0.04em" }}
    >
      {children}
    </span>
  );
}

// ---------- Chip ----------
interface ChipProps {
  children: ReactNode;
  variant?: "default" | "selected" | "add";
  removable?: boolean;
  onRemove?: () => void;
  checked?: boolean;
  onClick?: () => void;
}

export function Chip({ children, variant = "default", removable, onRemove, checked, onClick }: ChipProps) {
  let style: React.CSSProperties = {
    background: "var(--surface)",
    color: "var(--ink-2)",
    border: "1px solid var(--line-soft)",
  };
  if (variant === "selected") style = { background: "#f3e2cd", color: "#7a4a25", border: "1px solid #b87a4a" };
  if (variant === "add") style = { background: "transparent", color: "var(--ink-3)", border: "1px dashed var(--line)" };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium transition-all"
      style={style}
    >
      {checked && <Icon.Check size={12} />}
      <span>{children}</span>
      {removable && (
        <span
          role="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Icon.X size={12} />
        </span>
      )}
    </button>
  );
}

// ---------- Card ----------
export function Card({
  children,
  className = "",
  padding = "p-6",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`bg-surface rounded-2xl shadow-soft ${padding} ${interactive ? "card-hover cursor-pointer" : ""} ${className}`}
      style={{ border: "1px solid var(--line)" }}
    >
      {children}
    </div>
  );
}

// ---------- Section label (mono tag) ----------
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`font-mono-tag text-ink-3 ${className}`}>{children}</div>;
}

// ---------- StatusBadge ----------
// Maps ContactStatus DB values → display labels and visual styles.
// followUpDue is a derived flag (not a DB field): status ∈ {contacted, connected}
// AND last_interaction_at older than 30 days.
export type ContactStatusValue =
  | "discovered"
  | "contacted"
  | "connected"
  | "met"
  | "ongoing";

interface StatusBadgeProps {
  status: ContactStatusValue;
  followUpDue?: boolean;
}

const STATUS_MAP: Record<
  ContactStatusValue,
  { label: string; bg: string; fg: string; dot: string }
> = {
  discovered: { label: "New",        bg: "#f3e2cd", fg: "#7a4a25", dot: "#b87a4a" },
  contacted:  { label: "Contacted",  bg: "#dde6ee", fg: "#2f4d63", dot: "#4a6f87" },
  connected:  { label: "Connected",  bg: "#dcebd9", fg: "#34553e", dot: "#5e8d6a" },
  met:        { label: "Met",        bg: "#ede9fe", fg: "#4c1d95", dot: "#7c3aed" },
  ongoing:    { label: "Ongoing",    bg: "#dcebd9", fg: "#34553e", dot: "#5e8d6a" },
};

export function StatusBadge({ status, followUpDue }: StatusBadgeProps) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.discovered;

  if (followUpDue) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium"
        style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b" }}
      >
        <Icon.Alert size={10} />
        Follow-up due
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11.5px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span
        className="inline-block w-[6px] h-[6px] rounded-full"
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}

// ---------- Avatar ----------

/** Deterministic soft background for initials avatars — drawn from the warm palette */
const INITIALS_BG = [
  { bg: "#f3e2cd", fg: "#7a4a25" }, // sienna
  { bg: "#dde6ee", fg: "#2f4d63" }, // steel
  { bg: "#dcebd9", fg: "#34553e" }, // sage
  { bg: "#ede9fe", fg: "#4c1d95" }, // violet
  { bg: "#fef3c7", fg: "#92400e" }, // amber
  { bg: "#fce7f3", fg: "#9d174d" }, // rose
];

function avatarColorFor(name: string): { bg: string; fg: string } {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return INITIALS_BG[hash % INITIALS_BG.length];
}

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  // Initials on a deterministic soft tinted background — shown when there's no
  // photo OR (via AvatarImg's onError) when the remote image fails to load.
  const label = name ? nameInitials(name) : "?";
  const { bg, fg } = name ? avatarColorFor(name) : { bg: "#f3e2cd", fg: "#7a4a25" };
  const fontSize = Math.round(size * 0.36);

  const initialsEl = (
    <div
      className={`rounded-full flex-shrink-0 flex items-center justify-center select-none font-semibold ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize }}
      aria-label={name}
      title={name}
    >
      {label}
    </div>
  );

  if (src) {
    return (
      <AvatarImg src={src} size={size} className={className} fallback={initialsEl} />
    );
  }

  return initialsEl;
}
