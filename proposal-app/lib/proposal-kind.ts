import type { Proposal, ProposalKind } from "@/lib/types";

export const DEFAULT_PROPOSAL_TITLE = "Website Proposal & Agreement";
export const ADMIN_CREATE_PROPOSAL_KIND: ProposalKind = "uploaded_pdf";

const PROPOSAL_KIND_LABELS: Record<ProposalKind, string> = {
  custom_html: "Custom HTML/CSS",
  template: "Template",
  uploaded_pdf: "Uploaded PDF",
};

export function getProposalKindLabel(kind: ProposalKind | string | null | undefined): string {
  if (kind && kind in PROPOSAL_KIND_LABELS) {
    return PROPOSAL_KIND_LABELS[kind as ProposalKind];
  }
  return "Template";
}

export function canDownloadSignedPdf(proposal: Pick<Proposal, "status">): boolean {
  return proposal.status === "signed";
}
