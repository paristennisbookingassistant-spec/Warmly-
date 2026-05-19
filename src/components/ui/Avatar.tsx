import { useState } from "react";
import { getInitials, cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  src?: string | null;
  /** @deprecated use src */
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

/** Deterministic background color from name — picks from a pleasant palette */
function getAvatarColor(name: string): string {
  const palette = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-pink-500",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export default function Avatar({
  name,
  src,
  imageUrl,
  size = "md",
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const rawSrc = src ?? imageUrl;
  const imageSrc = !imgError ? rawSrc : null;

  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white select-none flex-shrink-0",
        sizeStyles[size],
        getAvatarColor(name),
        className
      )}
      aria-label={name}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
