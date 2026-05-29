"use client";

import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import {
  NotInstalledCard,
  NotLoggedInCard,
  ReadyCard,
  DetectingCard,
} from "./SyncCardStates";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LinkedInSyncCardProps {
  /** Called after the user clicks Sync — parent should create the sync job */
  onSyncStart: () => void;
  /** Whether the parent is currently creating the job on the server */
  syncStarting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LinkedInSyncCard({
  onSyncStart,
  syncStarting = false,
}: LinkedInSyncCardProps) {
  const { installed, linkedinLoggedIn, recheck } = useExtensionBridge();

  if (installed === null) return <DetectingCard />;
  if (!installed) return <NotInstalledCard onDetect={recheck} />;
  if (!linkedinLoggedIn) return <NotLoggedInCard onRecheck={recheck} />;

  return <ReadyCard onSync={onSyncStart} loading={syncStarting} />;
}
