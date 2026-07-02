import type { CSSProperties } from "react";
import { formatCents } from "@/lib/money";
import { MIDVORA_CONTACT } from "@/components/brand-header";
import type { Proposal, ProposalTemplateContent } from "@/lib/types";

export function ProposalView({ proposal }: { proposal: Proposal }) {
  if (proposal.proposal_kind === "custom_html") {
    return <CustomHtmlProposalView proposal={proposal} />;
  }
  if (proposal.proposal_kind === "uploaded_pdf") {
    return <UploadedPdfProposalView proposal={proposal} />;
  }
  return <TemplateProposalView proposal={proposal} />;
}

function TemplateProposalView({ proposal }: { proposal: Proposal }) {
  const content = proposal.proposal_content as ProposalTemplateContent;
  const style = {
    "--client-primary": proposal.brand_primary,
    "--client-accent": proposal.brand_accent,
  } as CSSProperties;

  return (
    <article style={style} className="bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-10">
      <header className="border-b border-border pb-3">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-display text-base font-bold uppercase text-[var(--client-accent)]">
            Midvora
          </span>
          <span className="text-muted-foreground">Proposal & Agreement</span>
        </div>
      </header>

      <section className="min-h-[430px] pt-8">
        <p className="text-xs font-bold uppercase text-muted-foreground">Prepared for</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--client-primary)]">
          {proposal.client_business || proposal.client_name}
        </h1>
        <div className="mt-1 text-sm text-foreground">
          {[proposal.client_address, proposal.client_email].filter(Boolean).join(" · ")}
        </div>

        <div className="mt-28 max-w-2xl">
          <h2 className="font-display text-xl font-bold text-[var(--client-accent)]">
            {proposal.proposal_title}
          </h2>
          <p className="mt-3 text-sm leading-6">
            {content.intro_body}{" "}
            <strong>{MIDVORA_CONTACT.name}</strong>
            {proposal.client_business ? (
              <>
                {" "}
                and <strong>{proposal.client_business}</strong>
              </>
            ) : null}
          </p>
        </div>

        <div className="mt-28 flex flex-wrap items-end gap-10">
          <div>
            <div className="font-display text-2xl font-bold text-brand-navy">MIDVORA</div>
            <div className="text-xs text-muted-foreground">{MIDVORA_CONTACT.tagline}</div>
          </div>
          {proposal.client_logo_path && (
            <div className="h-24 w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/proposal/${proposal.token}/logo`}
                alt={`${proposal.client_business || proposal.client_name} logo`}
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      </section>

      <ProposalSection eyebrow="The Partnership" title={content.partnership_heading}>
        <p>{content.partnership_body}</p>
      </ProposalSection>

      <ProposalSection eyebrow="What We Are Building" title={content.building_heading}>
        <FeatureGroup title="Core Pages" items={content.core_pages} />
        <FeatureGroup title="Interactive Features" items={content.interactive_features} />
        <FeatureGroup title="Smart Features" items={content.smart_features} />
        <FeatureGroup title="Technical Standards" items={content.technical_standards} />
      </ProposalSection>

      <ProposalSection eyebrow="Coming Next" title={content.next_phase_heading}>
        <p>{content.next_phase_body}</p>
        <ArrowList items={content.next_phase_items} />
      </ProposalSection>

      <ProposalSection eyebrow="Investment" title="What You Pay">
        <p>{content.investment_note}</p>
        <InvestmentTable proposal={proposal} />
        <TermsBlock title="Deposit due upon signing this proposal" body={content.deposit_terms} />
        <TermsBlock title="Final payment due when the site goes live" body={content.final_payment_terms} />
      </ProposalSection>

      <ProposalSection eyebrow="Ongoing Support" title={content.maintenance_heading}>
        <p>{content.maintenance_body}</p>
        <FeatureGroup title="What monthly support covers" items={content.maintenance_items} />
      </ProposalSection>

      <ProposalSection eyebrow="Referral Benefit" title={content.referral_heading}>
        <p>{content.referral_body}</p>
      </ProposalSection>

      <footer className="border-t border-border pt-6 text-center text-sm italic">
        {content.closing_note}
      </footer>
    </article>
  );
}

function UploadedPdfProposalView({ proposal }: { proposal: Proposal }) {
  const style = {
    "--client-primary": proposal.brand_primary,
    "--client-accent": proposal.brand_accent,
  } as CSSProperties;

  return (
    <article style={style} className="space-y-6 bg-white px-5 py-8 shadow-sm sm:px-8">
      <header className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-base font-bold uppercase text-[var(--client-accent)]">
              Midvora
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-[var(--client-primary)]">
              {proposal.proposal_title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepared for {proposal.client_business || proposal.client_name}
            </p>
          </div>
          {proposal.client_logo_path && (
            <div className="h-20 w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/proposal/${proposal.token}/logo`}
                alt={`${proposal.client_business || proposal.client_name} logo`}
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-card border border-border bg-muted/30">
        <iframe
          title={`${proposal.proposal_title} PDF preview`}
          src={`/api/proposal/${proposal.token}/source-pdf`}
          className="h-[720px] w-full"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {proposal.source_pdf_filename ?? "Uploaded proposal PDF"}
        </span>
        <a
          href={`/api/proposal/${proposal.token}/source-pdf`}
          target="_blank"
          className="font-medium text-brand-blue hover:underline"
        >
          Open PDF in a new tab
        </a>
      </div>
    </article>
  );
}

function CustomHtmlProposalView({ proposal }: { proposal: Proposal }) {
  return (
    <article className="overflow-hidden rounded-card border border-border bg-white shadow-sm">
      <iframe
        title={`${proposal.proposal_title} preview`}
        src={`/api/proposal/${proposal.token}/custom-html`}
        sandbox="allow-same-origin"
        className="h-[820px] w-full bg-white"
      />
    </article>
  );
}

function ProposalSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8">
      <p className="text-xs font-bold uppercase text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-4 font-display text-xl font-bold text-[var(--client-primary)]">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-6">{children}</div>
    </section>
  );
}

function FeatureGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-bold text-foreground">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="font-bold text-[var(--client-primary)]">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArrowList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="font-bold text-[var(--client-accent)]">→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InvestmentTable({ proposal }: { proposal: Proposal }) {
  if (proposal.line_items.length === 0 && proposal.total_price <= 0) return null;

  return (
    <div className="overflow-hidden border border-border">
      <table className="w-full text-sm">
        <tbody>
          {proposal.line_items.map((item) => (
            <tr key={item.description} className="border-b border-border last:border-b-0">
              <td className="bg-card-bg/60 px-4 py-3 font-bold">{item.description}</td>
              <td className="w-36 bg-card-bg/60 px-4 py-3 text-right font-bold text-[var(--client-primary)]">
                {formatCents(item.price)}
              </td>
            </tr>
          ))}
          {proposal.total_price > 0 && (
            <tr>
              <td className="px-4 py-3 text-right font-bold">Total</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--client-primary)]">
                {formatCents(proposal.total_price)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TermsBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <p>{body}</p>
    </div>
  );
}
