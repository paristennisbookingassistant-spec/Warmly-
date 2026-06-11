/**
 * components/v2/contacts/ContactDetailSkeleton.tsx
 * Skeleton for the contact detail layout (left card + right sidebar).
 */

export function ContactDetailSkeleton() {
  return (
    <div className="px-12 pt-8 pb-16 max-w-[1240px] mx-auto">
      {/* Back button skeleton */}
      <div className="flex items-center mb-7">
        <div className="h-4 w-16 rounded-full skeleton-pulse" style={{ background: "#ece2d0" }} />
      </div>

      <div className="grid grid-cols-[1fr_312px] gap-7">
        {/* Left card */}
        <div className="bg-white rounded-2xl p-8 skeleton-pulse" style={{ border: "1px solid #e5d8be" }}>
          {/* Identity */}
          <div className="flex items-start gap-5 mb-7">
            <div className="w-[72px] h-[72px] rounded-full flex-shrink-0" style={{ background: "#ece2d0" }} />
            <div className="flex-1 flex flex-col gap-3 pt-1">
              <div className="h-7 w-48 rounded-full" style={{ background: "#ece2d0" }} />
              <div className="h-4 w-64 rounded-full" style={{ background: "#f0e6d0" }} />
              <div className="h-3.5 w-40 rounded-full" style={{ background: "#f0e6d0" }} />
            </div>
          </div>
          {/* Story block */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: "#fbf6ec", border: "1px solid #ebdfc4" }}>
            <div className="h-3.5 w-24 rounded-full mb-4" style={{ background: "#e5d8be" }} />
            <div className="flex flex-col gap-2">
              {[100, 85, 90, 65].map((w, i) => (
                <div key={i} className="h-3 rounded-full" style={{ background: "#ece2d0", width: `${w}%` }} />
              ))}
            </div>
          </div>
          {/* Timeline stubs */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg" style={{ background: "#f9f3e7" }} />
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl p-5 skeleton-pulse" style={{ border: "1px solid #e5d8be" }}>
            <div className="h-3 w-16 rounded-full mb-4" style={{ background: "#ece2d0" }} />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg" style={{ background: "#f0e6d0" }} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 flex-1 skeleton-pulse" style={{ border: "1px solid #e5d8be" }}>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg" style={{ background: "#f0e6d0" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
