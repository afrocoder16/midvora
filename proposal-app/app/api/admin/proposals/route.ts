import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProposalSchema } from "@/lib/validation";
import { generateProposalToken } from "@/lib/token";
import { sumLineItems } from "@/lib/money";
import { sanitizeCustomHtmlContent } from "@/lib/custom-html";
import { createProposalInsertErrorResponse, errorJson } from "@/lib/api-errors";
import {
  uploadProposalLogo,
  uploadProposalPdf,
  validateLogoFile,
  validatePdfFile,
} from "@/lib/storage";
import type { ProposalCustomHtmlContent } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/admin/proposals — create a proposal and share link (admin only).
export async function POST(req: NextRequest) {
  // AuthZ: must be a logged-in admin (Supabase Auth session).
  const authed = await createServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return errorJson("Unauthorized.", 401);
  }

  let body: unknown;
  let logoFile: File | null = null;
  let sourcePdfFile: File | null = null;
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payload = formData.get("payload");
      if (typeof payload !== "string") {
        return errorJson("Missing proposal payload.", 400);
      }
      body = JSON.parse(payload);
      logoFile = getUploadedFile(formData, "client_logo");
      sourcePdfFile = getUploadedFile(formData, "source_pdf");
    } else {
      body = await req.json();
    }
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  const parsed = createProposalSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "Invalid input.";
    return errorJson(first, 400);
  }
  const {
    proposal_kind,
    client_name,
    client_business,
    client_address,
    client_email,
    brand_primary,
    brand_accent,
    proposal_title,
    proposal_content,
    line_items,
  } = parsed.data;

  if (logoFile) {
    const logoError = validateLogoFile(logoFile);
    if (logoError) return errorJson(logoError, 400);
  }
  if (proposal_kind === "uploaded_pdf") {
    if (!sourcePdfFile) {
      return errorJson("Upload a proposal PDF.", 400);
    }
    const pdfError = validatePdfFile(sourcePdfFile);
    if (pdfError) return errorJson(pdfError, 400);
  }

  const total_price = sumLineItems(line_items);
  const token = generateProposalToken();
  const proposalContentForStorage =
    proposal_kind === "custom_html"
      ? sanitizeCustomHtmlContent(proposal_content as ProposalCustomHtmlContent)
      : proposal_content;

  // Use the service-role client to insert (RLS allows no direct writes).
  const supabase = createAdminClient();

  let client_logo_path: string | null = null;
  let client_logo_mime_type: string | null = null;
  let source_pdf_path: string | null = null;
  let source_pdf_filename: string | null = null;

  try {
    if (logoFile) {
      const uploaded = await uploadProposalLogo(supabase, token, logoFile);
      client_logo_path = uploaded.path;
      client_logo_mime_type = uploaded.mimeType;
    }
    if (sourcePdfFile) {
      const uploaded = await uploadProposalPdf(supabase, token, sourcePdfFile);
      source_pdf_path = uploaded.path;
      source_pdf_filename = uploaded.filename;
    }
  } catch {
    return errorJson("Could not upload proposal assets.", 500);
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      token,
      proposal_kind,
      client_name,
      client_business: client_business || null,
      client_address: client_address || null,
      client_email,
      client_logo_path,
      client_logo_mime_type,
      brand_primary,
      brand_accent,
      proposal_title,
      proposal_content: proposalContentForStorage,
      source_pdf_path,
      source_pdf_filename,
      line_items,
      total_price,
      status: "sent",
    })
    .select("id, token")
    .single();

  if (error) {
    console.error("[admin/proposals] insert failed:", error);
    return createProposalInsertErrorResponse(error, proposal_kind);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const shareUrl = `${base.replace(/\/$/, "")}/proposal/${data.token}`;

  return NextResponse.json({ id: data.id, token: data.token, shareUrl }, { status: 201 });
}

function getUploadedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}
