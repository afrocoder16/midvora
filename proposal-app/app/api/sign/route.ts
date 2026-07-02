import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signProposalSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/ip";
import { renderSignedProposalPdf } from "@/lib/pdf";
import { sendSignedProposalEmail } from "@/lib/email";
import { normalizeProposal } from "@/lib/proposals";
import { errorJson, signProposalRpcErrorResponse } from "@/lib/api-errors";
import type { Proposal, Signature } from "@/lib/types";

// @react-pdf/renderer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Parse + validate/sanitize input.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  const parsed = signProposalSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "Invalid input.";
    return errorJson(first, 400);
  }
  const { token, signer_name, signature_image } = parsed.data;

  const supabase = createAdminClient();

  // 2. Look up the proposal by token.
  const { data: proposal, error: lookupErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .maybeSingle<Proposal>();

  if (lookupErr) {
    return errorJson("Could not load proposal.", 500);
  }
  if (!proposal) {
    return errorJson("Proposal not found.", 404);
  }

  // 3. Immutability guard: already signed -> reject (idempotent-ish 409).
  if (proposal.status === "signed") {
    return errorJson("This proposal has already been signed.", 409);
  }

  // 4. Capture server-side facts the client must NOT supply.
  const signer_ip = getClientIp(req.headers);
  const signed_at = new Date().toISOString();

  // 5. Atomically insert the signature and flip the proposal to 'signed'. The
  //    database function locks the proposal row, so a double-submit / race can
  //    only produce one recorded signature.
  const { data: signature, error: signErr } = await supabase
    .rpc("record_proposal_signature", {
      p_proposal_id: proposal.id,
      p_signer_name: signer_name,
      p_signature_image: signature_image,
      p_signer_ip: signer_ip,
      p_signed_at: signed_at,
    })
    .single<Signature>();

  if (signErr) {
    console.error("[sign] signature rpc failed:", signErr);
    return signProposalRpcErrorResponse(signErr);
  }

  const signedProposal: Proposal = normalizeProposal({ ...proposal, status: "signed" });

  // 6. Generate the signed PDF and email it to client + internal inbox.
  //    Email failures are logged but do not fail the request — the signature is
  //    already recorded and the client can still download the PDF.
  try {
    const pdf = await renderSignedProposalPdf(signedProposal, signature);
    const mail = await sendSignedProposalEmail({ proposal: signedProposal, pdf });
    if (!mail.ok) {
      console.error("[sign] email failed:", mail.error);
    }
  } catch (err) {
    console.error("[sign] pdf/email step failed:", err);
  }

  return NextResponse.json({ ok: true });
}
