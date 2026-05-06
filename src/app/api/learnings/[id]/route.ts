/**
 * PATCH /api/learnings/[id] — update a learning's status
 *
 * Body: { status: 'approved' | 'rejected' | 'archived' }
 *
 * Used by the Settings UI when the user clicks Approve / Reject on a
 * pending lesson candidate. Approved learnings start being injected
 * into outreach prompts immediately on the next generation.
 *
 * DELETE /api/learnings/[id] — hard-delete a learning
 * Optional alternative to PATCH→archived. Provided for symmetry; UI
 * should prefer archive for soft-delete.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  unauthorized,
  notFound,
  internalError,
  validationError,
  parseJsonBody,
} from "@/lib/api/helpers";
import type { UserLearning } from "@/types/database";

const UpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "archived"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data: body, error: parseErr } = await parseJsonBody(request);
  if (parseErr) return parseErr;

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const updatePayload: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.status === "approved") {
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("user_learnings")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") return notFound("Learning");
    console.error("learnings PATCH error:", error);
    return internalError("Failed to update learning");
  }

  return NextResponse.json({
    data: data as UserLearning,
    error: null,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error } = await supabase
    .from("user_learnings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("learnings DELETE error:", error);
    return internalError("Failed to delete learning");
  }

  return NextResponse.json({ data: { deleted: true }, error: null });
}
