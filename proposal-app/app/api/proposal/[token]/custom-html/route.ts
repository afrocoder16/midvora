import { NextRequest, NextResponse } from "next/server";
import { buildCustomHtmlDocument, CUSTOM_HTML_CSP } from "@/lib/custom-html";
import { getProposalByToken } from "@/lib/proposals";
import type { ProposalCustomHtmlContent } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);

  if (!proposal || proposal.proposal_kind !== "custom_html") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const html = buildCustomHtmlDocument(proposal.proposal_content as ProposalCustomHtmlContent, {
    title: proposal.proposal_title,
    token: proposal.token,
    clientName: proposal.client_name,
    clientBusiness: proposal.client_business,
    clientAddress: proposal.client_address,
    clientEmail: proposal.client_email,
    logoUrl: proposal.client_logo_path ? `/api/proposal/${proposal.token}/logo` : "",
    brandPrimary: proposal.brand_primary,
    brandAccent: proposal.brand_accent,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CUSTOM_HTML_CSP,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
