/**
 * components/v2/home/HomeSkeletons.tsx
 * Skeleton loaders for the Home screen — shown while API calls resolve.
 */

export function GreetingSkeleton() {
  return (
    <div className="text-center mb-10">
      <div className="mx-auto h-11 w-72 rounded-xl skeleton-pulse" style={{ background: "var(--line)" }} />
      <div className="mx-auto mt-3 h-4 w-48 rounded-lg skeleton-pulse" style={{ background: "var(--line-soft)" }} />
    </div>
  );
}

export function ActionCardSkeleton() {
  return (
    <div
      className="rounded-3xl overflow-hidden border"
      style={{ borderColor: "#e5d8be", minHeight: 340 }}
    >
      <div className="skeleton-pulse" style={{ background: "#faecd2", minHeight: 196 }} />
      <div className="px-8 py-4 flex flex-col gap-3" style={{ background: "#ffffff" }}>
        <div className="h-12 rounded-xl skeleton-pulse" style={{ background: "var(--line-soft)" }} />
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#ece2d0" }}>
          <div className="h-3 w-32 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
          <div className="h-10 w-28 rounded-lg skeleton-pulse" style={{ background: "var(--line)" }} />
        </div>
      </div>
    </div>
  );
}

export function StripSkeleton() {
  return (
    <div
      className="bg-white border rounded-2xl px-6 py-5"
      style={{ borderColor: "#e5d8be" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-3 w-28 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 h-14 rounded-xl skeleton-pulse"
            style={{ width: 240, background: "var(--line-soft)" }}
          />
        ))}
      </div>
    </div>
  );
}
