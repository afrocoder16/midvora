import { NextRequest, NextResponse } from "next/server";
import { getProposalByToken } from "@/lib/proposals";
import { renderSignedProposalPdf } from "@/lib/pdf";

export const runtime = "nodejs";

// Serves the signed proposal PDF for download. Only available once signed.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const proposal = await getProposalByToken(token);
  if (!proposal || proposal.status !== "signed" || !proposal.signature) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const pdf = await renderSignedProposalPdf(proposal, proposal.signature);
  const safeName = proposal.client_name.replace(/[^a-z0-9]+/gi, "-");

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Midvora-Proposal-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
