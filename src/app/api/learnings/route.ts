/**
 * GET /api/learnings — list the user's learnings (filterable by status)
 *
 * Query params:
 *   ?status=pending|approved|rejected|archived (optional)
 *   ?limit=N (default 50, max 200)
 *
 * Returns the user's learnings sorted newest first. Used by the Settings
 * UI to surface pending candidates for approval and to show the full
 * approved learning library.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorized, internalError, validationError } from "@/lib/api/helpers";
import type { UserLearning } from "@/types/database";

const QuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "archived"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );
  if (!parsed.success) {
    return validationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  let query = supabase
    .from("user_learnings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("learnings GET error:", error);
    return internalError("Failed to fetch learnings");
  }

  return NextResponse.json({
    data: { items: (data ?? []) as UserLearning[] },
    error: null,
  });
}
