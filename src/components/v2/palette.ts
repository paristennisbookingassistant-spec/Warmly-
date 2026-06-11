/**
 * components/v2/palette.ts
 * Channel palettes + tier styles for the V2 discovery UI.
 *
 * The warm base palette (cream / sienna / ink) lives in globals.css as design
 * tokens (bg, ink, accent...). These channel-specific colours are NOT in the
 * token set because they're brand-surface accents (INSEAD sienna/green,
 * LinkedIn slate/blue) used only inside Discover. Kept as literals here, mirrored
 * from the design bundle (design/warmly-v2/project/js/screens/discover.jsx).
 */

export type ChannelKey = "cv" | "linkedin";

export interface ChannelPalette {
  /** Full display name, e.g. "INSEAD Directory" */
  label: string;
  /** Short tag, e.g. "CV books" */
  short: string;
  /** Primary channel accent */
  accent: string;
  /** Soft tinted background */
  soft: string;
  /** Darker ink-on-soft text */
  ink: string;
  /** Translucent tint for shadows/halos */
  tint: string;
  /** Brand colour (only for brand surfaces): INSEAD green / LinkedIn blue */
  brand: string;
}

export const CHANNELS: Record<ChannelKey, ChannelPalette> = {
  cv: {
    label: "INSEAD Directory",
    short: "CV books",
    accent: "#b87a4a",
    soft: "#f3e2cd",
    ink: "#7a4a25",
    tint: "rgba(184,122,74,0.10)",
    brand: "#006438",
  },
  linkedin: {
    label: "LinkedIn Network",
    short: "Peer network",
    accent: "#4a6f87",
    soft: "#dde6ee",
    ink: "#2f4d63",
    tint: "rgba(74,111,135,0.10)",
    brand: "#0A66C2",
  },
};

export type Tier = "Strong" | "Good" | "Adjacent";

export interface TierStyle {
  bg: string;
  fg: string;
  dot: string;
}

export const TIER_STYLES: Record<Tier, TierStyle> = {
  Strong: { bg: "#dcebd9", fg: "#34553e", dot: "#5e8d6a" },
  Good: { bg: "#f3e2cd", fg: "#7a4a25", dot: "#b87a4a" },
  Adjacent: { bg: "#ece2d0", fg: "#6b5e4a", dot: "#8e8170" },
};

/** Map a numeric tier (1/2/3 from the scoring backend) to the V2 label. */
export function tierLabelFromNumber(tier: number | null | undefined): Tier {
  if (tier === 1) return "Strong";
  if (tier === 2) return "Good";
  return "Adjacent";
}
