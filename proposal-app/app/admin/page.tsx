import { AdminProposalsTable } from "@/components/admin-proposals-table";
import { CreateProposalForm } from "@/components/create-proposal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProposalSummaries } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let proposals: Awaited<ReturnType<typeof listProposalSummaries>> = [];
  let loadError: string | null = null;

  try {
    proposals = await listProposalSummaries();
  } catch (err) {
    console.error("[admin] failed to load proposals:", err);
    loadError = "Could not load the proposal list. Check the Supabase connection and migrations.";
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <CreateProposalForm />

      {loadError && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Proposal list unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminProposalsTable
            proposals={proposals}
            baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
          />
        </CardContent>
      </Card>
    </main>
  );
}
