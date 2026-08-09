import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ProposalKind } from "@/lib/types";

export function errorJson(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function createProposalInsertErrorResponse(
  error: PostgrestError,
  proposalKind: ProposalKind
): NextResponse {
  if (
    proposalKind === "custom_html" &&
    error.code === "23514" &&
    error.message.includes("proposals_proposal_kind_check")
  ) {
    return errorJson(
      "Database migration needed: run 20260629_custom_html_proposals.sql first.",
      500
    );
  }

  return errorJson("Could not create proposal.", 500);
}

export function deleteProposalRpcErrorResponse(error: PostgrestError): NextResponse {
  // PGRST202 = the RPC does not exist in the schema cache.
  if (error.code === "PGRST202" || error.message.includes("admin_delete_proposal")) {
    return errorJson(
      "Database migration needed: run 20260809_admin_delete_proposals.sql first.",
      500
    );
  }

  if (error.message.includes("signed proposal cannot be deleted")) {
    return errorJson(
      "Database migration needed: run 20260809_admin_delete_proposals.sql to allow deleting signed proposals.",
      500
    );
  }

  return errorJson("Could not delete proposal.", 500);
}

export function signProposalRpcErrorResponse(error: PostgrestError): NextResponse {
  if (error.code === "23505") {
    return errorJson("This proposal has already been signed.", 409);
  }

  if (
    error.code === "42702" &&
    error.message.includes("column reference \"id\" is ambiguous")
  ) {
    return errorJson(
      "Database migration needed: run 20260702_fix_signing_rpc_ambiguous_id.sql.",
      500
    );
  }

  return errorJson("Could not save signature.", 500);
}
