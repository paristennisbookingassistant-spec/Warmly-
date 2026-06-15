/**
 * components/v2/settings/SettingsSkeleton.tsx
 * Skeleton loader shown while user data is fetching.
 */

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border rounded-2xl p-7"
          style={{ borderColor: "#e5d8be" }}
        >
          <div className="h-3 w-20 rounded skeleton-pulse mb-5" style={{ background: "var(--line-soft)" }} />
          <div className="grid grid-cols-2 gap-5">
            <div className="h-10 rounded-lg skeleton-pulse" style={{ background: "var(--line-soft)" }} />
            <div className="h-10 rounded-lg skeleton-pulse" style={{ background: "var(--line-soft)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
