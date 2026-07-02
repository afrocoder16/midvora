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

  if (!proposal?.client_logo_path || !proposal.client_logo_mime_type) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const buffer = await downloadProposalAsset(createAdminClient(), proposal.client_logo_path);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": proposal.client_logo_mime_type,
      "Cache-Control": "private, max-age=300",
    },
  });
}
