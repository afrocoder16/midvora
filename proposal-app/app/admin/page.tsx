import Link from "next/link";
import { listProposals } from "@/lib/proposals";
import { formatCents } from "@/lib/money";
import { CreateProposalForm } from "@/components/create-proposal-form";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-tint text-brand-blue",
  signed: "bg-green-100 text-green-800",
};

export default async function AdminDashboard() {
  const proposals = await listProposals();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <CreateProposalForm />

      <Card>
        <CardHeader>
          <CardTitle>All proposals</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No proposals yet. Create your first one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => {
                  const shareUrl = `${base.replace(/\/$/, "")}/proposal/${p.token}`;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/proposal/${p.token}`}
                          target="_blank"
                          className="font-medium text-brand-navy hover:text-brand-blue"
                        >
                          {p.client_name}
                        </Link>
                        {p.client_business && (
                          <div className="text-xs text-muted-foreground">{p.client_business}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCents(p.total_price)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium capitalize ${
                            STATUS_STYLES[p.status] ?? STATUS_STYLES.draft
                          }`}
                        >
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <CopyLinkButton url={shareUrl} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
