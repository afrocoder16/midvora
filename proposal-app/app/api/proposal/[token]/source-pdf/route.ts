import { NextRequest, NextResponse } from "next/server";
import { getProposalByToken } from "@/lib/proposals";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadProposalAsset } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);

  if (proposal?.proposal_kind !== "uploaded_pdf" || !proposal.source_pdf_path) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const buffer = await downloadProposalAsset(createAdminClient(), proposal.source_pdf_path);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${proposal.source_pdf_filename ?? "proposal.pdf"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
