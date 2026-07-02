import { notFound } from "next/navigation";
import { getProposalByToken } from "@/lib/proposals";
import { ProposalView } from "@/components/proposal-view";
import { SignForm } from "@/components/sign-form";
import { SignedView } from "@/components/signed-view";
import { MIDVORA_CONTACT } from "@/components/brand-header";

// Always render fresh — status can flip from sent -> signed between visits.
export const dynamic = "force-dynamic";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);

  // Unknown / invalid token -> 404 (don't reveal whether it ever existed).
  if (!proposal) notFound();

  const isSigned = proposal.status === "signed" && proposal.signature;

  return (
    <main className="min-h-screen bg-cream py-8 sm:py-14">
      <div
        className={`mx-auto w-full px-4 ${
          proposal.proposal_kind === "custom_html" ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <ProposalView proposal={proposal} />

        <div className="mt-10">
          {isSigned ? (
            <SignedView token={proposal.token} signature={proposal.signature!} />
          ) : (
            <SignForm token={proposal.token} clientName={proposal.client_name} />
          )}
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {MIDVORA_CONTACT.name} · {MIDVORA_CONTACT.address} · {MIDVORA_CONTACT.phone} ·{" "}
          {MIDVORA_CONTACT.email}
        </footer>
      </div>
    </main>
  );
}
