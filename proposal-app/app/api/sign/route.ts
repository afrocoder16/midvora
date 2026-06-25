import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signProposalSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/ip";
import { renderSignedProposalPdf } from "@/lib/pdf";
import { sendSignedProposalEmail } from "@/lib/email";
import type { Proposal, Signature } from "@/lib/types";

// @react-pdf/renderer needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Parse + validate/sanitize input.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = signProposalSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 400 });
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
    return NextResponse.json({ error: "Could not load proposal." }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  // 3. Immutability guard: already signed -> reject (idempotent-ish 409).
  if (proposal.status === "signed") {
    return NextResponse.json(
      { error: "This proposal has already been signed." },
      { status: 409 }
    );
  }

  // 4. Capture server-side facts the client must NOT supply.
  const signer_ip = getClientIp(req.headers);
  const signed_at = new Date().toISOString();

  // 5. Insert the signature. The unique constraint on proposal_id prevents a
  //    duplicate from a double-submit / race.
  const { data: signature, error: sigErr } = await supabase
    .from("signatures")
    .insert({
      proposal_id: proposal.id,
      signer_name,
      signature_image,
      signed_at,
      signer_ip,
      agreed: true,
    })
    .select("*")
    .single<Signature>();

  if (sigErr) {
    // 23505 = unique_violation -> someone already signed in a race.
    if ((sigErr as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "This proposal has already been signed." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not save signature." }, { status: 500 });
  }

  // 6. Flip the proposal to 'signed'. After this the DB trigger makes it immutable.
  const { error: statusErr } = await supabase
    .from("proposals")
    .update({ status: "signed" })
    .eq("id", proposal.id);

  if (statusErr) {
    return NextResponse.json(
      { error: "Signature saved but status update failed. Please contact us." },
      { status: 500 }
    );
  }

  const signedProposal: Proposal = { ...proposal, status: "signed" };

  // 7. Generate the signed PDF and email it to client + internal inbox.
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
