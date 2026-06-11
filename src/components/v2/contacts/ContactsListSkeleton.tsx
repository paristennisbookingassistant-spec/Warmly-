/**
 * components/v2/contacts/ContactsListSkeleton.tsx
 * Skeleton loader for the contacts list — matches the row layout exactly.
 */

export function ContactsListSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5d8be" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 skeleton-pulse"
          style={{ borderColor: "#f0e6d0" }}
        >
          {/* avatar */}
          <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "#ece2d0" }} />
          {/* name + role */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="h-3 rounded-full w-36" style={{ background: "#ece2d0" }} />
            <div className="h-2.5 rounded-full w-56" style={{ background: "#f0e6d0" }} />
          </div>
          {/* badge */}
          <div className="h-5 w-20 rounded-full" style={{ background: "#f0e6d0" }} />
          {/* last contact */}
          <div className="h-2.5 w-14 rounded-full" style={{ background: "#f0e6d0" }} />
          {/* chevron */}
          <div className="w-3.5 h-3.5 rounded" style={{ background: "#f0e6d0" }} />
        </div>
      ))}
    </div>
  );
}

export function SavedTodayCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden skeleton-pulse" style={{ border: "1px solid #e5d8be" }}>
      <div className="px-4 py-2.5" style={{ background: "#f3e2cd" }}>
        <div className="h-2.5 w-32 rounded-full" style={{ background: "#e5ccb0" }} />
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-full" style={{ background: "#ece2d0" }} />
          <div className="flex-1 flex flex-col gap-2 pt-0.5">
            <div className="h-3.5 w-28 rounded-full" style={{ background: "#ece2d0" }} />
            <div className="h-2.5 w-44 rounded-full" style={{ background: "#f0e6d0" }} />
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          <div className="h-5 w-24 rounded-full" style={{ background: "#f0e6d0" }} />
          <div className="h-5 w-16 rounded-full" style={{ background: "#f0e6d0" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-full rounded-full" style={{ background: "#f0e6d0" }} />
          <div className="h-2.5 w-5/6 rounded-full" style={{ background: "#f0e6d0" }} />
          <div className="h-2.5 w-4/6 rounded-full" style={{ background: "#f0e6d0" }} />
        </div>
      </div>
    </div>
  );
}
