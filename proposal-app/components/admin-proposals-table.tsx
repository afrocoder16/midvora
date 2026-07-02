import Link from "next/link";
import { Download } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { canDownloadSignedPdf, getProposalKindLabel } from "@/lib/proposal-kind";
import type { ProposalSummary } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-tint text-brand-blue",
  signed: "bg-green-100 text-green-800",
};

export function AdminProposalsTable({
  proposals,
  baseUrl,
}: {
  proposals: ProposalSummary[];
  baseUrl: string;
}) {
  if (proposals.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No proposals yet. Create your first one above.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proposals.map((proposal) => (
          <ProposalRow
            key={proposal.id}
            proposal={proposal}
            shareUrl={`${baseUrl.replace(/\/$/, "")}/proposal/${proposal.token}`}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ProposalRow({ proposal, shareUrl }: { proposal: ProposalSummary; shareUrl: string }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/proposal/${proposal.token}`}
          target="_blank"
          className="font-medium text-brand-navy hover:text-brand-blue"
        >
          {proposal.client_name}
        </Link>
        {proposal.client_business && (
          <div className="text-xs text-muted-foreground">{proposal.client_business}</div>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {getProposalKindLabel(proposal.proposal_kind)}
      </TableCell>
      <TableCell className="font-medium">
        {proposal.total_price > 0 ? formatCents(proposal.total_price) : "-"}
      </TableCell>
      <TableCell>
        <span
          className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium capitalize ${
            STATUS_STYLES[proposal.status] ?? STATUS_STYLES.draft
          }`}
        >
          {proposal.status}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(proposal.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          {canDownloadSignedPdf(proposal) && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/proposal/${proposal.token}/pdf`} download>
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </a>
            </Button>
          )}
          <CopyLinkButton url={shareUrl} />
        </div>
      </TableCell>
    </TableRow>
  );
}
