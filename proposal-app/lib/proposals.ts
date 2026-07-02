import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCustomHtmlContent, normalizeTemplateContent } from "@/lib/proposal-content";
import type { Proposal, ProposalSummary, ProposalWithSignature, Signature } from "@/lib/types";

// Server-side data access for proposals. Uses the service-role client because
// public reads happen by unguessable token (no logged-in user to satisfy RLS).

export async function getProposalByToken(
  token: string
): Promise<ProposalWithSignature | null> {
  const supabase = createAdminClient();

  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("token", token)
    .maybeSingle<Proposal>();

  if (error) throw error;
  if (!proposal) return null;
  const normalizedProposal = normalizeProposal(proposal);

  const { data: signature } = await supabase
    .from("signatures")
    .select("*")
    .eq("proposal_id", normalizedProposal.id)
    .maybeSingle<Signature>();

  return { ...normalizedProposal, signature: signature ?? null };
}

export async function listProposals(): Promise<Proposal[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Proposal[]).map(normalizeProposal);
}

export async function listProposalSummaries(): Promise<ProposalSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proposals")
    .select(
      "id, token, proposal_kind, client_name, client_business, total_price, status, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProposalSummary[]).map(normalizeProposalSummary);
}

export function normalizeProposal(proposal: Proposal): Proposal {
  const proposalKind = proposal.proposal_kind ?? "template";

  return {
    ...proposal,
    proposal_kind: proposalKind,
    client_address: proposal.client_address ?? null,
    client_logo_path: proposal.client_logo_path ?? null,
    client_logo_mime_type: proposal.client_logo_mime_type ?? null,
    brand_primary: proposal.brand_primary ?? "#1F5D2B",
    brand_accent: proposal.brand_accent ?? "#F96B2B",
    proposal_title: proposal.proposal_title ?? "Website Proposal & Agreement",
    proposal_content:
      proposalKind === "custom_html"
        ? normalizeCustomHtmlContent(proposal.proposal_content)
        : normalizeTemplateContent(proposal.proposal_content),
    source_pdf_path: proposal.source_pdf_path ?? null,
    source_pdf_filename: proposal.source_pdf_filename ?? null,
  };
}

function normalizeProposalSummary(proposal: ProposalSummary): ProposalSummary {
  return {
    ...proposal,
    proposal_kind: proposal.proposal_kind ?? "template",
    client_business: proposal.client_business ?? null,
    total_price: proposal.total_price ?? 0,
  };
}
