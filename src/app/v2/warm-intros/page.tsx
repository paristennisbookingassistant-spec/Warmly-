/**
 * app/v2/warm-intros/page.tsx
 * Warm Intros page — surfaces 2nd-degree introduction candidates via opted-in peers.
 * Uses WarmIntrosLane (client component) for all interactive state.
 */

import { WarmIntrosLane } from "@/components/v2/warm-intros/WarmIntrosLane";

export default function WarmIntrosPage() {
  return <WarmIntrosLane />;
}
