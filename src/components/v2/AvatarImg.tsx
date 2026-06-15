"use client";

import { useState } from "react";

/**
 * Avatar image with a graceful initials fallback. Used by the `Avatar`
 * primitive when a `src` is present. If the remote image fails to load
 * (broken LinkedIn CDN link, dead pravatar URL, 404, etc.) we swap to the
 * provided `fallback` (the initials block) instead of showing a blank circle.
 */
export function AvatarImg({
  src,
  size,
  className = "",
  fallback,
}: {
  src: string;
  size: number;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: "var(--bg-sunk)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote avatars (LinkedIn CDN / pravatar), no static import */}
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
