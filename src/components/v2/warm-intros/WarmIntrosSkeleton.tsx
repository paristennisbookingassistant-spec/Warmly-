/**
 * components/v2/warm-intros/WarmIntrosSkeleton.tsx
 * Skeleton loaders for the warm-intros page.
 */

export function WarmIntrosCardSkeleton() {
  return (
    <div
      className="bg-white border rounded-2xl p-5 flex flex-col gap-4"
      style={{ borderColor: "#e5d8be" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full skeleton-pulse flex-shrink-0" style={{ background: "#f3e2cd" }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3.5 w-36 rounded skeleton-pulse" style={{ background: "#f3e2cd" }} />
          <div className="h-3 w-24 rounded skeleton-pulse" style={{ background: "#ece2d0" }} />
        </div>
      </div>
      <div className="h-16 rounded-xl skeleton-pulse" style={{ background: "#fbf6ec" }} />
      <div className="h-7 w-28 rounded-full skeleton-pulse" style={{ background: "#dde6ee" }} />
      <div className="h-10 rounded-xl skeleton-pulse" style={{ background: "#f3e2cd" }} />
    </div>
  );
}

export function WarmIntrosPageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <WarmIntrosCardSkeleton key={i} />
      ))}
    </div>
  );
}
