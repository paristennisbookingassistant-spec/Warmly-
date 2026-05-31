/**
 * lib/supabase/contacts.ts
 * Typed CRUD helpers for the contacts table.
 * Focus: bulk UPSERT for LinkedIn network sync (Phase 1 + Phase 2).
 */

import type { SupabaseServerClient } from "./server";
import type { BulkImportContactItem } from "@/types/api";

// ---------------------------------------------------------------------------
// Bulk upsert result shape
// ---------------------------------------------------------------------------

export interface BulkUpsertResult {
  inserted: number;
  updated: number;
  errors: Array<{ linkedinUrn: string; error: string }>;
}

// ---------------------------------------------------------------------------
// bulkUpsertContacts
// ---------------------------------------------------------------------------

/**
 * Upserts a batch of LinkedIn contacts for a user.
 *
 * Conflict key: (user_id, linkedin_url) — enforced by the DB unique index.
 * On conflict: update only LinkedIn-sourced columns; never overwrite manual
 * fields (notes, status, user_action, discovery_session_id, etc.).
 *
 * Phase 1 ("list"): populates basic fields only.
 * Phase 2 ("batch"): also writes experience, education_v2, linkedin_bio, location.
 *
 * Per-item errors are collected rather than aborting the batch.
 */
export async function bulkUpsertContacts(
  supabase: SupabaseServerClient,
  userId: string,
  syncJobId: string,
  phase: "list" | "batch",
  batch: BulkImportContactItem[]
): Promise<BulkUpsertResult> {
  const inserted: string[] = [];
  const updated: string[] = [];
  const errors: Array<{ linkedinUrn: string; error: string }> = [];

  // Process items individually so failures are isolated.
  // Batch sizes are capped at 50 by the endpoint; individual DB round-trips
  // are acceptable here given that frequency is throttled at 1 batch / 10s.
  await Promise.all(
    batch.map(async (item) => {
      try {
        // Check whether this (user_id, linkedin_url) pair already exists
        // so we can return accurate inserted vs updated counts.
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("user_id", userId)
          .eq("linkedin_url", item.linkedinUrl)
          .maybeSingle();

        const isNew = !existing;
        const existingId = existing?.id as string | undefined;

        // Build the row to upsert.
        // Fields NOT included here are protected from sync overwrites:
        //   notes, status, user_action, reviewed_at, discovery_session_id,
        //   relevance_score, tier, scoring_breakdown, recommendation_reason,
        //   suggested_hook, profile_snapshot, career_history, education (v1).
        const row: Record<string, unknown> = {
          user_id: userId,
          linkedin_url: item.linkedinUrl,
          linkedin_urn: item.linkedinUrn,
          sync_job_id: syncJobId,
          source: "discovery",
          // New contacts from sync default to 'pending' triage so they flow
          // through the swipe deck rather than appearing unreviewed in /contacts.
          ...(isNew ? { user_action: "pending", status: "discovered" } : {}),
        };

        // Identity fields are owned by Phase 1 (the connections list). Phase 2
        // enrichment sends the URL slug as a name placeholder and no photo, so
        // we must NOT let it clobber them: only write name on insert or Phase 1,
        // and only overwrite a field when a real value is supplied (never null
        // it out). This prevents enrichment from wiping the real name + photo.
        if (isNew || phase === "list") row.name = item.name;
        if (item.currentTitle) row.current_title = item.currentTitle;
        if (item.currentCompany) row.company = item.currentCompany;
        if (item.photoUrl) {
          row.avatar_url = item.photoUrl;
          row.photo_url = item.photoUrl;
        }
        // Headline (the LinkedIn tagline, e.g. "Growth Investing | INSEAD MBA")
        // is captured in Phase 1 and stored in linkedin_bio (whose own purpose
        // is "headline text"). Only write when present so enrichment never nulls it.
        if (item.headline) row.linkedin_bio = item.headline;

        // Phase 2: deep enrichment fields
        if (phase === "batch") {
          // Only overwrite the stored headline if Phase 2 supplies a real bio.
          if (item.bio) row.linkedin_bio = item.bio;
          if (item.location !== undefined) row.location = item.location;
          if (item.experience !== undefined) {
            row.experience = item.experience.map((e) => ({
              title: e.title,
              company: e.company,
              dateRange: e.dateRange ?? { start: null, end: null },
              ...(e.description ? { description: e.description } : {}),
              ...(e.location ? { location: e.location } : {}),
            }));
          }
          if (item.education !== undefined) {
            row.education_v2 = item.education.map((edu) => ({
              school: edu.school,
              ...(edu.degree ? { degree: edu.degree } : {}),
              ...(edu.fieldOfStudy ? { fieldOfStudy: edu.fieldOfStudy } : {}),
              dateRange: edu.dateRange ?? { start: null, end: null },
            }));
          }
        }

        // Explicit insert-or-update rather than .upsert({onConflict}). The
        // production unique index on (user_id, linkedin_url) is PARTIAL
        // (WHERE linkedin_url IS NOT NULL), which Postgres ON CONFLICT cannot
        // target without the matching predicate — it errors "no unique or
        // exclusion constraint matching the ON CONFLICT specification". We
        // already know isNew from the existence check above, so branch on it.
        const { error: upsertError } = isNew
          ? await supabase.from("contacts").insert(row)
          : await supabase.from("contacts").update(row).eq("id", existingId!);

        if (upsertError) {
          errors.push({ linkedinUrn: item.linkedinUrn, error: upsertError.message });
          return;
        }

        if (isNew) {
          inserted.push(item.linkedinUrn);
        } else {
          updated.push(item.linkedinUrn);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push({ linkedinUrn: item.linkedinUrn, error: msg });
      }
    })
  );

  return {
    inserted: inserted.length,
    updated: updated.length,
    errors,
  };
}
