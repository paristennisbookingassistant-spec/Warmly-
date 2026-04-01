/**
 * utils/index.ts
 * General utility helpers shared across the application.
 */

/**
 * Formats a relative time string for display.
 * e.g. "2 days ago", "3 weeks ago"
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Returns the display color class for a contact's tier badge.
 * Tier 1 = green (strong match), 2 = blue (good), 3 = amber (adjacent).
 */
export function getTierColor(tier: 1 | 2 | 3 | null): string {
  if (tier === 1) return "bg-green-100 text-green-800";
  if (tier === 2) return "bg-blue-100 text-blue-800";
  if (tier === 3) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-500";
}

/**
 * Returns the display label for a contact status.
 */
export function getStatusLabel(
  status: "discovered" | "contacted" | "connected" | "met" | "ongoing"
): string {
  const labels = {
    discovered: "Discovered",
    contacted: "Contacted",
    connected: "Connected",
    met: "Met",
    ongoing: "Ongoing",
  };
  return labels[status];
}

/**
 * Returns the Tailwind color class for a contact status indicator dot.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    discovered: "bg-gray-400",
    contacted: "bg-blue-400",
    connected: "bg-indigo-400",
    met: "bg-purple-400",
    ongoing: "bg-green-400",
  };
  return colors[status] ?? "bg-gray-400";
}

/**
 * Truncates text to a maximum length with an ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Returns initials from a full name.
 * e.g. "Marie Chen" → "MC"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Classnames utility — merges Tailwind class strings.
 * Simple implementation; install 'clsx' for production use.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formats a score (1–10) as a display string with one decimal place.
 */
export function formatScore(score: number | null): string {
  if (score === null) return "–";
  return score.toFixed(1);
}

/**
 * Computes the relationship health status based on last interaction date.
 * green = recent (< 30 days), yellow = stale (30-60 days), red = dormant (> 60 days).
 * See PRD REL-05.
 */
export function getRelationshipHealth(
  lastInteractionAt: string | null
): "green" | "yellow" | "red" | "none" {
  if (!lastInteractionAt) return "none";

  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince < 30) return "green";
  if (daysSince < 60) return "yellow";
  return "red";
}
