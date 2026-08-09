import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteProposalRpcErrorResponse, errorJson } from "@/lib/api-errors";
import { removeProposalAssets } from "@/lib/storage";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DELETE /api/admin/proposals/:id — permanently remove a proposal, its
// signature, and its uploaded files (admin only). Used to clear out test rows.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // AuthZ: must be a logged-in admin (Supabase Auth session).
  const authed = await createServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return errorJson("Unauthorized.", 401);
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorJson("Invalid proposal id.", 400);
  }

  const supabase = createAdminClient();

  // Read the asset paths before the row disappears.
  const { data: proposal, error: lookupError } = await supabase
    .from("proposals")
    .select("id, source_pdf_path, client_logo_path")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      source_pdf_path: string | null;
      client_logo_path: string | null;
    }>();

  if (lookupError) {
    console.error("[admin/proposals] delete lookup failed:", lookupError);
    return errorJson("Could not delete proposal.", 500);
  }
  if (!proposal) {
    return errorJson("Proposal not found.", 404);
  }

  // Goes through the RPC rather than a direct delete: it is the only path the
  // immutability triggers let through for a signed proposal.
  const { data: deleted, error } = await supabase.rpc("admin_delete_proposal", {
    p_proposal_id: id,
  });

  if (error) {
    console.error("[admin/proposals] delete failed:", error);
    return deleteProposalRpcErrorResponse(error);
  }
  if (!deleted) {
    return errorJson("Proposal not found.", 404);
  }

  await removeProposalAssets(supabase, [proposal.source_pdf_path, proposal.client_logo_path]);

  return NextResponse.json({ ok: true });
}
