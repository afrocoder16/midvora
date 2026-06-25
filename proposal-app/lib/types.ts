// Shared domain types for the Midvora proposals app.

export type ProposalStatus = "draft" | "sent" | "signed";

export interface LineItem {
  description: string;
  /** Price in cents. */
  price: number;
}

export interface Proposal {
  id: string;
  token: string;
  client_name: string;
  client_business: string | null;
  client_email: string;
  line_items: LineItem[];
  /** Total in cents. */
  total_price: number;
  status: ProposalStatus;
  created_at: string;
}

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
