// Shared domain types for the Midvora proposals app.

export type ProposalStatus = "draft" | "sent" | "signed";
export type ProposalKind = "template" | "uploaded_pdf" | "custom_html";

export interface LineItem {
  description: string;
  /** Price in cents. */
  price: number;
}

export interface ProposalTemplateContent {
  intro_heading: string;
  intro_body: string;
  partnership_heading: string;
  partnership_body: string;
  building_heading: string;
  core_pages: string[];
  interactive_features: string[];
  smart_features: string[];
  technical_standards: string[];
  next_phase_heading: string;
  next_phase_body: string;
  next_phase_items: string[];
  investment_note: string;
  deposit_terms: string;
  final_payment_terms: string;
  maintenance_heading: string;
  maintenance_body: string;
  maintenance_items: string[];
  referral_heading: string;
  referral_body: string;
  closing_note: string;
}

export interface ProposalCustomHtmlContent {
  html: string;
  css: string;
  page_title: string;
}

export type ProposalContent = ProposalTemplateContent | ProposalCustomHtmlContent;

export interface Proposal {
  id: string;
  token: string;
  proposal_kind: ProposalKind;
  client_name: string;
  client_business: string | null;
  client_email: string;
  client_address: string | null;
  client_logo_path: string | null;
  client_logo_mime_type: string | null;
  brand_primary: string;
  brand_accent: string;
  proposal_title: string;
  proposal_content: ProposalContent;
  source_pdf_path: string | null;
  source_pdf_filename: string | null;
  line_items: LineItem[];
  /** Total in cents. */
  total_price: number;
  status: ProposalStatus;
  created_at: string;
}

export type ProposalSummary = Pick<
  Proposal,
  | "id"
  | "token"
  | "proposal_kind"
  | "client_name"
  | "client_business"
  | "total_price"
  | "status"
  | "created_at"
>;

export interface Signature {
  id: string;
  proposal_id: string;
  signer_name: string;
  /** data URL (base64 PNG) of the drawn signature. */
  signature_image: string;
  signed_at: string;
  signer_ip: string | null;
  agreed: boolean;
}

/** A proposal joined with its signature (present only when signed). */
export interface ProposalWithSignature extends Proposal {
  signature: Signature | null;
}
