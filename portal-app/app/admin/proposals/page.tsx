import { FileSignature } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ProposalSummary = {
  id: string;
  client_name: string;
  client_business: string | null;
  client_email: string;
  proposal_title: string;
  status: "draft" | "sent" | "signed";
  total_price: number;
};

type SignatureWithProposal = {
  id: string;
  signer_name: string;
  signed_at: string;
  agreed: boolean;
  proposal: ProposalSummary | ProposalSummary[] | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
  timeZoneName: "short",
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function proposalFromRelation(
  relation: SignatureWithProposal["proposal"]
): ProposalSummary | null {
  return Array.isArray(relation) ? relation[0] || null : relation;
}

export default async function AdminProposalsPage() {
  await requireAdmin();

  // Read-only join based on the actual proposal schema: signed_at and signer
  // details live on signatures, while client and proposal details live on
  // proposals. No proposal or signature mutation is exposed in the portal.
  const { data, error } = await createAdminClient()
    .from("signatures")
    .select(
      `
        id,
        signer_name,
        signed_at,
        agreed,
        proposal:proposals!inner (
          id,
          client_name,
          client_business,
          client_email,
          proposal_title,
          status,
          total_price
        )
      `
    )
    .eq("agreed", true)
    .order("signed_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load signed proposals.");
  }

  const signings = ((data ?? []) as SignatureWithProposal[])
    .map((signature) => ({
      signature,
      proposal: proposalFromRelation(signature.proposal),
    }))
    .filter(
      (row): row is { signature: SignatureWithProposal; proposal: ProposalSummary } =>
        row.proposal !== null && row.proposal.status === "signed"
    );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-medium text-brand-blue">Admin workspace</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-brand-navy">
          Signings
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A read-only view of completed proposal signatures, newest first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-tint p-2 text-brand-blue">
              <FileSignature aria-hidden="true" className="size-5" />
            </span>
            <div>
              <CardTitle>Signed proposals</CardTitle>
              <CardDescription className="mt-1">
                {signings.length} {signings.length === 1 ? "signature" : "signatures"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {signings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
              <p className="font-medium text-brand-navy">No signed proposals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed signatures will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Client</th>
                    <th className="px-3 py-3 font-medium">Proposal</th>
                    <th className="px-3 py-3 font-medium">Signer</th>
                    <th className="px-3 py-3 font-medium">Signed</th>
                    <th className="px-3 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {signings.map(({ signature, proposal }) => (
                    <tr key={signature.id} className="align-top">
                      <td className="px-3 py-4">
                        <p className="font-medium text-brand-navy">
                          {proposal.client_business || proposal.client_name}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {proposal.client_email}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-brand-navy">
                          {proposal.proposal_title}
                        </p>
                        <span className="mt-2 inline-flex rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Signed
                        </span>
                      </td>
                      <td className="px-3 py-4 text-brand-navy">
                        {signature.signer_name}
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">
                        <time dateTime={signature.signed_at}>
                          {dateTimeFormatter.format(new Date(signature.signed_at))}
                        </time>
                      </td>
                      <td className="px-3 py-4 text-right font-semibold tabular-nums text-brand-navy">
                        {moneyFormatter.format(proposal.total_price / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
