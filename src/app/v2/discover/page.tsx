/**
 * app/v2/discover/page.tsx
 * Discover experience — two-door chooser + swipe deck + LinkedIn setup.
 *
 * DiscoverScreen reads ?discovery_session_id via useSearchParams, which requires
 * a Suspense boundary here (Next.js App Router rule).
 */

import { Suspense } from "react";
import { DiscoverScreen } from "@/components/v2/discover/DiscoverScreen";

function DiscoverSkeleton() {
  return (
    <div className="px-10 pt-7 pb-6 max-w-[1280px] mx-auto flex-1 flex flex-col w-full">
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 rounded-lg skeleton-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl skeleton-pulse" />
          <div className="h-48 rounded-2xl skeleton-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function V2DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <DiscoverScreen />
    </Suspense>
  );
}
