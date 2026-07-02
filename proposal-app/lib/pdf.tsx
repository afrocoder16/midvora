import "server-only";
import { existsSync } from "node:fs";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import chromium from "@sparticuz/chromium";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import puppeteer from "puppeteer-core";
import { MIDVORA_CONTACT } from "@/components/brand-header";
import { buildCustomHtmlDocument, escapeHtml } from "@/lib/custom-html";
import { formatCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadProposalAsset, downloadProposalAssetDataUrl } from "@/lib/storage";
import type {
  Proposal,
  ProposalCustomHtmlContent,
  ProposalTemplateContent,
  Signature,
} from "@/lib/types";

const NAVY = "#0A1628";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  topRule: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  midvora: { fontFamily: "Helvetica-Bold", color: "#F96B2B", fontSize: 12 },
  muted: { color: MUTED },
  cover: { minHeight: 430, paddingTop: 28 },
  eyebrow: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  clientName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 80 },
  paragraph: { lineHeight: 1.45, marginTop: 8 },
  logoRow: { flexDirection: "row", alignItems: "flex-end", gap: 36, marginTop: 100 },
  midvoraLogo: { width: 130 },
  clientLogo: { width: 120, height: 80, objectFit: "contain" },
  section: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 18, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 8 },
  groupTitle: { fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 4 },
  listItem: { flexDirection: "row", marginBottom: 3 },
  marker: { width: 12, color: NAVY, fontFamily: "Helvetica-Bold" },
  listText: { flex: 1, lineHeight: 1.35 },
  table: { marginTop: 10, borderWidth: 1, borderColor: BORDER },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  tdDesc: { flex: 1, padding: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#F3F0EA" },
  tdPrice: {
    width: 110,
    padding: 8,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#F3F0EA",
  },
  totalLabel: { flex: 1, padding: 8, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalValue: { width: 110, padding: 8, textAlign: "right", fontFamily: "Helvetica-Bold" },
  signBlock: { marginTop: 24, borderWidth: 1, borderColor: BORDER, padding: 14 },
  sigImageBox: { marginTop: 8, width: 220, height: 80, borderWidth: 1, borderColor: BORDER },
  sigImage: { width: "100%", height: "100%", objectFit: "contain" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  metaItem: { width: "50%", marginBottom: 8 },
  metaLabel: { fontSize: 8, color: MUTED },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 1 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
});

export async function renderSignedProposalPdf(
  proposal: Proposal,
  signature: Signature
): Promise<Buffer> {
  if (proposal.proposal_kind === "custom_html") {
    return renderCustomHtmlProposalPdf(proposal, signature);
  }

  if (proposal.proposal_kind === "uploaded_pdf" && proposal.source_pdf_path) {
    return appendSignatureCertificateToUploadedPdf(proposal, signature);
  }

  const logoDataUrl =
    proposal.client_logo_path && proposal.client_logo_mime_type
      ? await safeLoadLogo(proposal.client_logo_path, proposal.client_logo_mime_type)
      : null;

  return renderToBuffer(
    <TemplateProposalPdf proposal={proposal} signature={signature} logoDataUrl={logoDataUrl} />
  );
}

function TemplateProposalPdf({
  proposal,
  signature,
  logoDataUrl,
}: {
  proposal: Proposal;
  signature: Signature;
  logoDataUrl: string | null;
}) {
  const content = proposal.proposal_content as ProposalTemplateContent;
  const signedDate = formatSignedDate(signature.signed_at);
  const primaryStyle = { color: proposal.brand_primary };
  const accentStyle = { color: proposal.brand_accent };

  return (
    <Document title={`Midvora Proposal - ${proposal.client_name}`} author="Midvora">
      <Page size="A4" style={styles.page}>
        <Header />

        <View style={styles.cover}>
          <Text style={styles.eyebrow}>Prepared for</Text>
          <Text style={[styles.clientName, primaryStyle]}>
            {proposal.client_business || proposal.client_name}
          </Text>
          {proposal.client_address ? <Text>{proposal.client_address}</Text> : null}
          <Text style={[styles.title, accentStyle]}>{proposal.proposal_title}</Text>
          <Text style={styles.paragraph}>{content.intro_body}</Text>

          <View style={styles.logoRow}>
            <View style={styles.midvoraLogo}>
              <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY }}>
                MIDVORA
              </Text>
              <Text style={styles.muted}>{MIDVORA_CONTACT.tagline}</Text>
            </View>
            {logoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.clientLogo} src={logoDataUrl} />
            ) : null}
          </View>
        </View>

        <PdfSection eyebrow="The Partnership" title={content.partnership_heading}>
          <Text style={styles.paragraph}>{content.partnership_body}</Text>
        </PdfSection>

        <PdfSection eyebrow="What We Are Building" title={content.building_heading}>
          <PdfList title="Core Pages" items={content.core_pages} />
          <PdfList title="Interactive Features" items={content.interactive_features} />
          <PdfList title="Smart Features" items={content.smart_features} />
          <PdfList title="Technical Standards" items={content.technical_standards} />
        </PdfSection>

        <PdfSection eyebrow="Coming Next" title={content.next_phase_heading}>
          <Text style={styles.paragraph}>{content.next_phase_body}</Text>
          <PdfList items={content.next_phase_items} marker="->" />
        </PdfSection>

        <PdfSection eyebrow="Investment" title="What You Pay">
          <Text style={styles.paragraph}>{content.investment_note}</Text>
          {proposal.line_items.length > 0 || proposal.total_price > 0 ? (
            <View style={styles.table}>
              {proposal.line_items.map((item) => (
                <View style={styles.tr} key={item.description}>
                  <Text style={styles.tdDesc}>{item.description}</Text>
                  <Text style={[styles.tdPrice, primaryStyle]}>{formatCents(item.price)}</Text>
                </View>
              ))}
              {proposal.total_price > 0 ? (
                <View style={{ flexDirection: "row" }}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={[styles.totalValue, primaryStyle]}>
                    {formatCents(proposal.total_price)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold" }]}>
            Deposit due upon signing this proposal
          </Text>
          <Text style={styles.paragraph}>{content.deposit_terms}</Text>
          <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold" }]}>
            Final payment due when the site goes live
          </Text>
          <Text style={styles.paragraph}>{content.final_payment_terms}</Text>
        </PdfSection>

        <PdfSection eyebrow="Ongoing Support" title={content.maintenance_heading}>
          <Text style={styles.paragraph}>{content.maintenance_body}</Text>
          <PdfList items={content.maintenance_items} />
        </PdfSection>

        <PdfSection eyebrow="Referral Benefit" title={content.referral_heading}>
          <Text style={styles.paragraph}>{content.referral_body}</Text>
        </PdfSection>

        <SignatureBlock signature={signature} signedDate={signedDate} />
        <Footer />
      </Page>
    </Document>
  );
}

function Header() {
  return (
    <View style={styles.topRule} fixed>
      <Text style={styles.midvora}>MIDVORA</Text>
      <Text style={styles.muted}>Proposal & Agreement</Text>
    </View>
  );
}

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      {MIDVORA_CONTACT.name} - {MIDVORA_CONTACT.email} - {MIDVORA_CONTACT.phone}
    </Text>
  );
}

function PdfSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} wrap>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PdfList({
  title,
  items,
  marker = "-",
}: {
  title?: string;
  items: string[];
  marker?: string;
}) {
  if (items.length === 0) return null;
  return (
    <View>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      {items.map((item) => (
        <View style={styles.listItem} key={item}>
          <Text style={styles.marker}>{marker}</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SignatureBlock({
  signature,
  signedDate,
}: {
  signature: Signature;
  signedDate: string;
}) {
  return (
    <View style={styles.signBlock}>
      <Text style={styles.eyebrow}>Accepted & signed</Text>
      <View style={styles.sigImageBox}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.sigImage} src={signature.signature_image} />
      </View>
      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Signed by</Text>
          <Text style={styles.metaValue}>{signature.signer_name}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Date & time (Central)</Text>
          <Text style={styles.metaValue}>{signedDate}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>IP address</Text>
          <Text style={styles.metaValue}>{signature.signer_ip ?? "Unavailable"}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Agreed to terms</Text>
          <Text style={styles.metaValue}>{signature.agreed ? "Yes" : "No"}</Text>
        </View>
      </View>
    </View>
  );
}

async function appendSignatureCertificateToUploadedPdf(
  proposal: Proposal,
  signature: Signature
): Promise<Buffer> {
  if (!proposal.source_pdf_path) throw new Error("Uploaded PDF path is missing.");

  const supabase = createAdminClient();
  const sourcePdf = await downloadProposalAsset(supabase, proposal.source_pdf_path);
  const pdf = await PDFDocument.load(sourcePdf);
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const primary = hexToRgb(proposal.brand_primary);
  const accent = hexToRgb(proposal.brand_accent);
  const signedDate = formatSignedDate(signature.signed_at);

  page.drawText("MIDVORA", { x: 54, y: 742, size: 13, font: bold, color: accent });
  page.drawText("Signed Proposal Certificate", {
    x: 390,
    y: 742,
    size: 10,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  });
  page.drawLine({
    start: { x: 54, y: 730 },
    end: { x: 558, y: 730 },
    thickness: 0.8,
    color: rgb(0.88, 0.88, 0.88),
  });

  page.drawText("Proposal accepted", { x: 54, y: 666, size: 22, font: bold, color: primary });
  drawWrappedText(
    page,
    `This certificate records the electronic acceptance of the proposal for ${proposal.client_business || proposal.client_name}.`,
    54,
    632,
    500,
    12,
    regular
  );

  const signatureImage = await pdf.embedPng(dataUrlToBuffer(signature.signature_image));
  const signatureDims = signatureImage.scaleToFit(260, 90);
  page.drawImage(signatureImage, {
    x: 54,
    y: 470,
    width: signatureDims.width,
    height: signatureDims.height,
  });
  page.drawLine({
    start: { x: 54, y: 455 },
    end: { x: 360, y: 455 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });
  page.drawText("Signature", { x: 54, y: 440, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });

  const rows = [
    ["Signed by", signature.signer_name],
    ["Date & time (Central)", signedDate],
    ["IP address", signature.signer_ip ?? "Unavailable"],
    ["Agreed to terms", signature.agreed ? "Yes" : "No"],
  ];

  let y = 380;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 54, y, size: 9, font: regular, color: rgb(0.45, 0.45, 0.45) });
    page.drawText(value, { x: 210, y, size: 11, font: bold, color: rgb(0.07, 0.09, 0.12) });
    y -= 30;
  }

  page.drawText(`${MIDVORA_CONTACT.name} - ${MIDVORA_CONTACT.email} - ${MIDVORA_CONTACT.phone}`, {
    x: 54,
    y: 54,
    size: 8,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  });

  return Buffer.from(await pdf.save());
}

async function renderCustomHtmlProposalPdf(
  proposal: Proposal,
  signature: Signature
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: process.platform === "win32" ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args,
    defaultViewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
    executablePath: await resolveChromiumExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const logoDataUrl =
      proposal.client_logo_path && proposal.client_logo_mime_type
        ? await safeLoadLogo(proposal.client_logo_path, proposal.client_logo_mime_type)
        : null;
    const html = buildCustomHtmlDocument(proposal.proposal_content as ProposalCustomHtmlContent, {
      title: proposal.proposal_title,
      token: proposal.token,
      clientName: proposal.client_name,
      clientBusiness: proposal.client_business,
      clientAddress: proposal.client_address,
      clientEmail: proposal.client_email,
      logoUrl: logoDataUrl ?? "",
      brandPrimary: proposal.brand_primary,
      brandAccent: proposal.brand_accent,
      extraCss: SIGNATURE_CERTIFICATE_CSS,
      extraBodyHtml: buildSignatureCertificateHtml(proposal, signature),
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function resolveChromiumExecutablePath(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (process.platform === "win32") {
    const candidates = [
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ].filter(Boolean);

    const localExecutable = candidates.find((candidate) => existsSync(candidate));
    if (localExecutable) return localExecutable;
  }

  return chromium.executablePath();
}

const SIGNATURE_CERTIFICATE_CSS = `
  .midvora-signature-certificate,
  .midvora-signature-certificate * {
    box-sizing: border-box;
  }

  .midvora-signature-certificate {
    break-before: page;
    page-break-before: always;
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto;
    padding: 0.62in 0.72in;
    background: #ffffff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.45;
  }

  .midvora-signature-certificate__header {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 12px;
    color: #6b7280;
    font-size: 12px;
  }

  .midvora-signature-certificate__brand {
    color: #f96b2b;
    font-weight: 700;
    letter-spacing: 0;
  }

  .midvora-signature-certificate h1 {
    margin: 72px 0 12px;
    color: var(--midvora-client-primary, #1f5d2b);
    font-size: 28px;
    line-height: 1.15;
  }

  .midvora-signature-certificate p {
    margin: 0 0 18px;
    font-size: 14px;
  }

  .midvora-signature-certificate__signature {
    margin-top: 56px;
    max-width: 320px;
  }

  .midvora-signature-certificate__signature img {
    display: block;
    width: 300px;
    height: 100px;
    object-fit: contain;
  }

  .midvora-signature-certificate__line {
    border-top: 1px solid #111827;
    color: #6b7280;
    font-size: 11px;
    padding-top: 7px;
  }

  .midvora-signature-certificate__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px 32px;
    margin-top: 42px;
    font-size: 13px;
  }

  .midvora-signature-certificate__grid span {
    display: block;
    color: #6b7280;
    font-size: 11px;
    margin-bottom: 3px;
  }

  .midvora-signature-certificate__footer {
    margin-top: 110px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
    color: #6b7280;
    font-size: 11px;
    text-align: center;
  }
`;

function buildSignatureCertificateHtml(proposal: Proposal, signature: Signature): string {
  const signedDate = formatSignedDate(signature.signed_at);
  const client = proposal.client_business || proposal.client_name;

  return `
    <section class="midvora-signature-certificate" aria-label="Signed proposal certificate">
      <div class="midvora-signature-certificate__header">
        <div class="midvora-signature-certificate__brand">MIDVORA</div>
        <div>Signed Proposal Certificate</div>
      </div>

      <h1>Proposal accepted</h1>
      <p>This certificate records the electronic acceptance of the proposal for <strong>${escapeHtml(client)}</strong>.</p>

      <div class="midvora-signature-certificate__signature">
        <img src="${escapeHtml(signature.signature_image)}" alt="Signature of ${escapeHtml(
          signature.signer_name
        )}" />
        <div class="midvora-signature-certificate__line">Signature</div>
      </div>

      <div class="midvora-signature-certificate__grid">
        <div><span>Signed by</span><strong>${escapeHtml(signature.signer_name)}</strong></div>
        <div><span>Date & time (Central)</span><strong>${escapeHtml(signedDate)}</strong></div>
        <div><span>IP address</span><strong>${escapeHtml(signature.signer_ip ?? "Unavailable")}</strong></div>
        <div><span>Agreed to terms</span><strong>${signature.agreed ? "Yes" : "No"}</strong></div>
      </div>

      <div class="midvora-signature-certificate__footer">
        ${escapeHtml(MIDVORA_CONTACT.name)} - ${escapeHtml(MIDVORA_CONTACT.email)} - ${escapeHtml(
          MIDVORA_CONTACT.phone
        )}
      </div>
    </section>`;
}

async function safeLoadLogo(path: string, mimeType: string): Promise<string | null> {
  try {
    return await downloadProposalAssetDataUrl(createAdminClient(), path, mimeType);
  } catch {
    return null;
  }
}

function formatSignedDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });
}

function dataUrlToBuffer(value: string): Buffer {
  const base64 = value.split(",")[1];
  if (!base64) throw new Error("Invalid signature image.");
  return Buffer.from(base64, "base64");
}

function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#0A1628";
  const value = Number.parseInt(normalized.slice(1), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function drawWrappedText(
  page: import("pdf-lib").PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: import("pdf-lib").PDFFont
) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color: rgb(0.07, 0.09, 0.12) });
      line = word;
      currentY -= size + 5;
    } else {
      line = next;
    }
  }
  if (line) page.drawText(line, { x, y: currentY, size, font, color: rgb(0.07, 0.09, 0.12) });
}
