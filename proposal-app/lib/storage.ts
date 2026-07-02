import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PROPOSAL_ASSETS_BUCKET = "proposal-assets";

const LOGO_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!file || file.size === 0) return null;
  if (!LOGO_TYPES.has(file.type)) return "Logo must be PNG, JPG, WebP, or SVG.";
  if (file.size > MAX_LOGO_BYTES) return "Logo must be 2MB or smaller.";
  return null;
}

export function validatePdfFile(file: File): string | null {
  if (!file || file.size === 0) return "Upload a proposal PDF.";
  if (file.type !== "application/pdf") return "Proposal file must be a PDF.";
  if (file.size > MAX_PDF_BYTES) return "Proposal PDF must be 25MB or smaller.";
  return null;
}

export async function uploadProposalLogo(
  supabase: SupabaseClient,
  token: string,
  file: File
): Promise<{ path: string; mimeType: string }> {
  const extension = LOGO_TYPES.get(file.type) ?? "bin";
  const path = `proposals/${token}/client-logo.${extension}`;
  await uploadFile(supabase, path, file, file.type);
  return { path, mimeType: file.type };
}

export async function uploadProposalPdf(
  supabase: SupabaseClient,
  token: string,
  file: File
): Promise<{ path: string; filename: string }> {
  const path = `proposals/${token}/source.pdf`;
  await uploadFile(supabase, path, file, "application/pdf");
  return { path, filename: sanitizeFilename(file.name || "proposal.pdf") };
}

export async function downloadProposalAsset(
  supabase: SupabaseClient,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(PROPOSAL_ASSETS_BUCKET).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not download proposal asset.");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function downloadProposalAssetDataUrl(
  supabase: SupabaseClient,
  path: string,
  mimeType: string
): Promise<string> {
  const buffer = await downloadProposalAsset(supabase, path);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function uploadFile(
  supabase: SupabaseClient,
  path: string,
  file: File,
  contentType: string
) {
  const { error } = await supabase.storage.from(PROPOSAL_ASSETS_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return cleaned || "proposal.pdf";
}
