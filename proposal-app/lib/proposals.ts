import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Proposal, ProposalWithSignature, Signature } from "@/lib/types";

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

  const { data: signature } = await supabase
    .from("signatures")
    .select("*")
    .eq("proposal_id", proposal.id)
    .maybeSingle<Signature>();

  return { ...proposal, signature: signature ?? null };
}

export async function listProposals(): Promise<Proposal[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Proposal[];
}
