/**
 * POST /api/contacts/bulk-import
 *
 * Accepts a batch of LinkedIn contacts from the Warmly Chrome extension
 * and upserts them into the contacts table.
 *
 * Phase 1 ("list"): inserts basic fields (name, headline, photo, company, title, URL).
 * Phase 2 ("batch"): also writes deep fields (experience, education, bio, location).
 *
 * Manual-only fields (notes, status, user_action, scoring results) are never
 * overwritten by this endpoint.
 *
 * Auth required. Batch size limit: 50 items. Validated with Zod.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { bulkUpsertContacts } from "@/lib/supabase/contacts";
import { getSyncJob, updateSyncJob } from "@/lib/supabase/sync-jobs";
import {
  unauthorized,
  validationError,
  notFound,
  badRequest,
  internalError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { BulkImportResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const DateRangeSchema = z.object({
  start: z.string().nullable().optional().default(null),
  end: z.string().nullable().optional().default(null),
});

const ExperienceEntrySchema = z.object({
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(500),
  dateRange: DateRangeSchema.optional(),
  description: z.string().max(5000).optional(),
  location: z.string().max(200).optional(),
});

const EducationEntrySchema = z.object({
  school: z.string().min(1).max(500),
  degree: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  dateRange: DateRangeSchema.optional(),
});

const BulkImportItemSchema = z.object({
  linkedinUrl: z.string().url("linkedinUrl must be a valid URL"),
  linkedinUrn: z.string().min(1, "linkedinUrn is required"),
  name: z.string().min(1).max(300),
  headline: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  currentCompany: z.string().max(300).optional(),
  currentTitle: z.string().max(300).optional(),
  // Phase 2 only
  bio: z.string().max(5000).optional(),
  experience: z.array(ExperienceEntrySchema).max(50).optional(),
  education: z.array(EducationEntrySchema).max(30).optional(),
  location: z.string().max(300).optional(),
});

const BulkImportBodySchema = z.object({
  syncJobId: z.string().uuid("syncJobId must be a valid UUID"),
  phase: z.enum(["list", "batch"]),
  batch: z
    .array(BulkImportItemSchema)
    .min(1, "batch must contain at least one item")
    .max(50, "batch size limit is 50 items"),
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  // Parse + validate body
  const { data: rawBody, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = BulkImportBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { syncJobId, phase, batch } = parsed.data;

  // Verify the sync_job exists and belongs to the authenticated user.
  // RLS enforces ownership; getSyncJob returns null if row missing or foreign.
  let syncJob;
  try {
    syncJob = await getSyncJob(supabase, syncJobId);
  } catch {
    return internalError("Failed to verify sync job");
  }

  if (!syncJob) {
    return notFound("Sync job");
  }

  // Guard: only allow imports against active jobs
  if (syncJob.status === "completed" || syncJob.status === "failed") {
    return badRequest(
      `Sync job is already ${syncJob.status}. Create a new sync job to import more contacts.`
    );
  }

  // Upsert the batch
  let result;
  try {
    result = await bulkUpsertContacts(supabase, user.id, syncJobId, phase, batch);
  } catch (err) {
    console.error("bulk-import upsert error:", err);
    return internalError("Failed to import contacts");
  }

  // Update sync_job processed count (non-blocking — failures are logged, not thrown)
  const successCount = result.inserted + result.updated;
  if (successCount > 0) {
    try {
      await updateSyncJob(supabase, syncJobId, {
        processed_contacts: syncJob.processed_contacts + successCount,
        // Transition to in_progress on first successful batch
        ...(syncJob.status === "pending" ? { status: "in_progress" } : {}),
      });
    } catch (err) {
      // Non-critical — count drift is acceptable; don't fail the response
      console.warn("bulk-import: failed to update sync_job processed count:", err);
    }
  }

  const response: BulkImportResponse = {
    data: result,
    error: null,
  };

  return NextResponse.json(response, { status: 200 });
}
