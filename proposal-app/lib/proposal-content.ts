import type { ProposalCustomHtmlContent, ProposalTemplateContent } from "@/lib/types";

export const DEFAULT_TEMPLATE_CONTENT: ProposalTemplateContent = {
  intro_heading: "Website Proposal & Agreement",
  intro_body:
    "A mutual agreement outlining the work, pricing, and terms of our partnership.",
  partnership_heading: "The Partnership",
  partnership_body:
    "You deserve a website that works as hard as you do. This proposal outlines how Midvora will bring that experience to life with a clean, fast, mobile-ready site built for local business.",
  building_heading: "What We Are Building",
  core_pages: [
    "Home page with clear positioning, calls to action, and trust-building content",
    "Services page with the details clients need before reaching out",
    "Contact page with phone, email, map, and inquiry form",
  ],
  interactive_features: [
    "Mobile-first experience for visitors on phones",
    "Smooth scroll-reveal sections and polished interactions",
  ],
  smart_features: [
    "SSL security from day one",
    "SEO-ready page structure",
    "Fast load times for local mobile networks",
  ],
  technical_standards: [
    "Responsive design across phone, tablet, and desktop",
    "Clean code built for maintainability",
    "Analytics-ready foundation",
  ],
  next_phase_heading: "Coming Next",
  next_phase_body:
    "Future integrations can be added after launch as the business grows.",
  next_phase_items: [
    "Online ordering, booking, payments, or deeper business-system integrations",
    "Loyalty, promotions, and automation features",
  ],
  investment_note: "No hidden fees, no surprises.",
  deposit_terms:
    "Deposit due upon signing this proposal. Work begins after acceptance and deposit payment.",
  final_payment_terms:
    "Final payment is due when the site goes live unless otherwise agreed in writing.",
  maintenance_heading: "Monthly Maintenance",
  maintenance_body:
    "After your site goes live, Midvora can stay on as your tech partner for updates and support.",
  maintenance_items: [
    "Website updates for photos, services, prices, and hours",
    "Security monitoring and monthly backup",
    "Bug fixes and technical support",
  ],
  referral_heading: "Referral Benefit",
  referral_body:
    "If you refer another local business to Midvora and they sign up, you receive one free month of maintenance.",
  closing_note:
    "Thank you for trusting Midvora with your business. We are honored to be your tech partner.",
};

export const DEFAULT_CUSTOM_HTML_CONTENT: ProposalCustomHtmlContent = {
  page_title: "Website Proposal & Agreement",
  html: `<main class="proposal">
  <header class="cover">
    <div class="topline">
      <strong>MIDVORA</strong>
      <span>Proposal & Agreement</span>
    </div>
    <p class="eyebrow">Prepared for</p>
    <h1>{{client_business}}</h1>
    <p class="client-meta">{{client_address}} | {{client_email}}</p>
    <section class="intro">
      <h2>Website Proposal & Agreement</h2>
      <p>A clear, client-friendly proposal for a custom website built around your brand, goals, and next steps.</p>
    </section>
    <div class="logo-row">
      <div class="midvora-mark">MIDVORA</div>
      <img src="{{client_logo_url}}" alt="Client logo" />
    </div>
  </header>

  <section class="page-section">
    <p class="eyebrow">The partnership</p>
    <h2>A website that feels like your business</h2>
    <p>Use this space for the client-specific story, scope, deliverables, pricing, and terms.</p>
  </section>

  <section class="page-section">
    <p class="eyebrow">Investment</p>
    <h2>What you pay</h2>
    <table>
      <tr>
        <td>Website Design & Build</td>
        <td>$0</td>
      </tr>
    </table>
  </section>
</main>`,
  css: `@page {
  size: Letter;
  margin: 0;
}

body {
  margin: 0;
  background: #f6f4ef;
  color: #151515;
  font-family: Georgia, "Times New Roman", serif;
}

.proposal {
  width: 8.5in;
  min-height: 11in;
  margin: 0 auto;
  background: white;
  padding: 0.55in 0.7in;
}

.topline {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #dddddd;
  padding-bottom: 10px;
  color: #999999;
  font: 12px Arial, sans-serif;
}

.topline strong {
  color: #f96b2b;
}

.cover {
  min-height: 9.6in;
}

.eyebrow {
  margin-top: 28px;
  color: #666666;
  font: bold 12px Arial, sans-serif;
  text-transform: uppercase;
}

h1 {
  margin: 8px 0 0;
  color: #1f5d2b;
  font-size: 28px;
}

h2 {
  color: #1f5d2b;
  font-size: 22px;
}

.intro {
  margin-top: 2.4in;
  max-width: 620px;
}

.intro h2 {
  color: #f96b2b;
}

.logo-row {
  display: flex;
  align-items: end;
  gap: 36px;
  margin-top: 2.4in;
}

.logo-row img {
  max-width: 150px;
  max-height: 90px;
  object-fit: contain;
}

.midvora-mark {
  color: #0a1628;
  font: bold 26px Arial, sans-serif;
}

.page-section {
  border-top: 1px solid #dddddd;
  padding: 28px 0;
  break-inside: avoid;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  border: 1px solid #dddddd;
  padding: 12px;
}

td:last-child {
  text-align: right;
  font-weight: bold;
  color: #1f5d2b;
}`,
};

export function normalizeTemplateContent(input: unknown): ProposalTemplateContent {
  if (!input || typeof input !== "object") return DEFAULT_TEMPLATE_CONTENT;
  const value = input as Partial<ProposalTemplateContent>;

  return {
    ...DEFAULT_TEMPLATE_CONTENT,
    ...value,
    core_pages: normalizeList(value.core_pages, DEFAULT_TEMPLATE_CONTENT.core_pages),
    interactive_features: normalizeList(
      value.interactive_features,
      DEFAULT_TEMPLATE_CONTENT.interactive_features
    ),
    smart_features: normalizeList(value.smart_features, DEFAULT_TEMPLATE_CONTENT.smart_features),
    technical_standards: normalizeList(
      value.technical_standards,
      DEFAULT_TEMPLATE_CONTENT.technical_standards
    ),
    next_phase_items: normalizeList(
      value.next_phase_items,
      DEFAULT_TEMPLATE_CONTENT.next_phase_items
    ),
    maintenance_items: normalizeList(
      value.maintenance_items,
      DEFAULT_TEMPLATE_CONTENT.maintenance_items
    ),
  };
}

export function normalizeCustomHtmlContent(input: unknown): ProposalCustomHtmlContent {
  if (!input || typeof input !== "object") return DEFAULT_CUSTOM_HTML_CONTENT;
  const value = input as Partial<ProposalCustomHtmlContent>;

  return {
    page_title: normalizeText(value.page_title, DEFAULT_CUSTOM_HTML_CONTENT.page_title),
    html: normalizeText(value.html, DEFAULT_CUSTOM_HTML_CONTENT.html),
    css: normalizeText(value.css, DEFAULT_CUSTOM_HTML_CONTENT.css),
  };
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const clean = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return clean.length > 0 ? clean : fallback;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
