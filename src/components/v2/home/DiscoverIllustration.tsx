/**
 * components/v2/home/DiscoverIllustration.tsx
 * Radar/network SVG illustration for the DiscoverCard header band.
 */

export const DISCOVER_PALETTE = {
  accent: "#5e8d6a",
  soft: "#dce8d8",
  ink: "#34553e",
  border: "#e5d8be",
  borderHover: "#5e8d6a",
  shadowBase: "0 1px 0 rgba(31,27,22,0.04), 0 6px 22px rgba(31,27,22,0.05)",
  shadowHover: "0 0 0 1px #5e8d6a inset, 0 14px 32px rgba(94,141,106,0.10)",
};

export function DiscoverIllustration() {
  const accent = DISCOVER_PALETTE.accent;
  return (
    <svg width="120" height="100" viewBox="0 0 140 120" className="flex-shrink-0">
      <circle cx="70" cy="60" r="50" fill="none" stroke={accent} strokeOpacity="0.18" />
      <circle cx="70" cy="60" r="34" fill="none" stroke={accent} strokeOpacity="0.28" />
      <circle cx="70" cy="60" r="18" fill="none" stroke={accent} strokeOpacity="0.4" />
      <circle cx="70" cy="60" r="9" fill="#1f1b16" />
      <circle cx="70" cy="60" r="9" fill="none" stroke="#ffffff" strokeWidth="2" />
      <line x1="70" y1="60" x2="42" y2="32" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="42" cy="32" r="8" fill={accent} />
      <line x1="70" y1="60" x2="108" y2="42" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="108" cy="42" r="6" fill={accent} />
      <line x1="70" y1="60" x2="95" y2="92" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="95" cy="92" r="7" fill={accent} />
      <line x1="70" y1="60" x2="32" y2="78" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="32" cy="78" r="5" fill={accent} opacity="0.7" />
      <circle cx="70" cy="60" r="50" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6">
        <animate attributeName="r" values="40;58;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
