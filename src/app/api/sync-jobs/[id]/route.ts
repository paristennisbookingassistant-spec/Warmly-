/**
 * GET /api/sync-jobs/[id]
 *
 * Returns the current state of a sync_job for live polling.
 * The frontend uses this (or Supabase realtime) to display progress.
 * The extension service worker polls this to detect "paused" / "completed"
 * states before resuming or stopping.
 *
 * Auth required. RLS ensures users can only read their own rows.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSyncJob } from "@/lib/supabase/sync-jobs";
import { unauthorized, validationError, notFound, internalError } from "@/lib/api/helpers";
import type { GetSyncJobResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const parsed = ParamsSchema.safeParse({ id });
  if (!parsed.success) {
    return validationError(
      "Invalid path parameter",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  let syncJob;
  try {
    syncJob = await getSyncJob(supabase, parsed.data.id);
  } catch (err) {
    console.error("sync-jobs GET error:", err);
    return internalError("Failed to fetch sync job");
  }

  if (!syncJob) {
    return notFound("Sync job");
  }

  const response: GetSyncJobResponse = {
    data: syncJob,
    error: null,
  };

  return NextResponse.json(response);
}
