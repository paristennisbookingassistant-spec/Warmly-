import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "block" | "circle" | "card";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

export default function Skeleton({
  variant = "block",
  width,
  height,
  className,
}: SkeletonProps) {
  const base = "skeleton-pulse bg-slate-100 rounded-md";

  const variantStyles: Record<SkeletonVariant, string> = {
    text: "h-4 rounded",
    block: "rounded-lg",
    circle: "rounded-full",
    card: "rounded-xl h-32",
  };

  return (
    <div
      className={cn(base, variantStyles[variant], className)}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
      }}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a single contact card in the grid */
export function ContactCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Skeleton for a chat message */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <Skeleton variant="circle" className="w-7 h-7 flex-shrink-0 mt-1" />
      )}
      <div
        className={cn(
          "space-y-2 max-w-[60%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <Skeleton className={cn("h-4", isUser ? "w-40" : "w-56")} />
        <Skeleton className={cn("h-4", isUser ? "w-32" : "w-44")} />
        {!isUser && <Skeleton className="h-4 w-36" />}
      </div>
    </div>
  );
}

/** Skeleton for session sidebar items */
export function SessionItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton variant="circle" className="w-7 h-7 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}

/** Full page loading skeleton */
export function PageSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContactCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
