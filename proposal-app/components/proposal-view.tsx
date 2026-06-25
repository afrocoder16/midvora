import { formatCents } from "@/lib/money";
import { MIDVORA_CONTACT } from "@/components/brand-header";
import type { Proposal } from "@/lib/types";

// Read-only, branded rendering of the proposal scope + line items + total.
// Shared by the signing page and the already-signed view.
export function ProposalView({ proposal }: { proposal: Proposal }) {
  return (
    <div className="space-y-8">
      {/* Header band */}
      <div className="rounded-card bg-brand-navy px-6 py-8 text-white sm:px-10">
        <div className="flex flex-col gap-1">
          <span className="font-display text-3xl font-bold tracking-tight">Midvora</span>
          <span className="text-sm text-white/70">{MIDVORA_CONTACT.tagline}</span>
        </div>
        <div className="mt-6 text-sm text-white/60">
          {MIDVORA_CONTACT.address} · {MIDVORA_CONTACT.phone} · {MIDVORA_CONTACT.email}
        </div>
      </div>

      {/* Prepared for */}
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prepared for
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-brand-navy">
          {proposal.client_name}
        </p>
        {proposal.client_business && (
          <p className="text-base text-muted-foreground">{proposal.client_business}</p>
        )}
        <p className="text-sm text-muted-foreground">{proposal.client_email}</p>
      </div>

      {/* Scope / line items */}
      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-5 py-3 font-semibold text-brand-navy">Scope of work</th>
              <th className="w-40 px-5 py-3 text-right font-semibold text-brand-navy">
                Investment
              </th>
            </tr>
          </thead>
          <tbody>
            {proposal.line_items.map((item, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="px-5 py-4 text-foreground">{item.description}</td>
                <td className="px-5 py-4 text-right font-medium text-foreground">
                  {formatCents(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-navy/20 bg-blue-tint/40">
              <td className="px-5 py-4 text-right font-display text-lg font-semibold text-brand-navy">
                Total
              </td>
              <td className="px-5 py-4 text-right font-display text-lg font-bold text-brand-blue">
                {formatCents(proposal.total_price)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
