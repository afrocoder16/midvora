import "server-only";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import { MIDVORA_CONTACT } from "@/components/brand-header";
import type { Proposal, Signature } from "@/lib/types";

// Brand palette (must be literal hex — @react-pdf doesn't read Tailwind).
const NAVY = "#0A1628";
const BLUE = "#0054DF";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  header: { backgroundColor: NAVY, padding: 20, borderRadius: 8, marginBottom: 24 },
  brand: { color: "#FFFFFF", fontSize: 22, fontFamily: "Helvetica-Bold" },
  tagline: { color: "#FFFFFF", opacity: 0.75, fontSize: 9, marginTop: 4 },
  contact: { color: "#FFFFFF", opacity: 0.6, fontSize: 8, marginTop: 12 },

  sectionLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  clientName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  clientMeta: { fontSize: 10, color: MUTED, marginTop: 2 },

  table: { marginTop: 20, borderWidth: 1, borderColor: BORDER, borderRadius: 6 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  th: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 9 },
  tr: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  colDesc: { flex: 1, paddingRight: 12 },
  colPrice: { width: 110, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: "#D6E4FF",
    backgroundColor: "#EEF5FF",
  },
  totalLabel: { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 11 },
  totalValue: { width: 110, textAlign: "right", fontFamily: "Helvetica-Bold", color: BLUE, fontSize: 11 },

  signBlock: { marginTop: 30, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 16 },
  sigImageBox: {
    marginTop: 8,
    width: 240,
    height: 90,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 4,
  },
  sigImage: { width: "100%", height: "100%", objectFit: "contain" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  metaItem: { width: "50%", marginBottom: 8 },
  metaLabel: { fontSize: 8, color: MUTED },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 1 },

  footer: {
    position: "absolute",
    bottom: 28,
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

function SignedProposalDoc({
  proposal,
  signature,
}: {
  proposal: Proposal;
  signature: Signature;
}) {
  const signedDate = new Date(signature.signed_at).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });

  return (
    <Document title={`Midvora Proposal — ${proposal.client_name}`} author="Midvora">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Midvora</Text>
          <Text style={styles.tagline}>{MIDVORA_CONTACT.tagline}</Text>
          <Text style={styles.contact}>
            {MIDVORA_CONTACT.address} · {MIDVORA_CONTACT.phone} · {MIDVORA_CONTACT.email}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Prepared for</Text>
        <Text style={styles.clientName}>{proposal.client_name}</Text>
        {proposal.client_business ? (
          <Text style={styles.clientMeta}>{proposal.client_business}</Text>
        ) : null}
        <Text style={styles.clientMeta}>{proposal.client_email}</Text>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>Scope of work</Text>
            <Text style={[styles.th, styles.colPrice]}>Investment</Text>
          </View>
          {proposal.line_items.map((item, i) => (
            <View style={styles.tr} key={i}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colPrice}>{formatCents(item.price)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCents(proposal.total_price)}</Text>
          </View>
        </View>

        <View style={styles.signBlock}>
          <Text style={styles.sectionLabel}>Accepted &amp; signed</Text>
          <View style={styles.sigImageBox}>
            {/* base64 PNG data URL renders directly */}
            <Image style={styles.sigImage} src={signature.signature_image} />
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Signed by</Text>
              <Text style={styles.metaValue}>{signature.signer_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date &amp; time (Central)</Text>
              <Text style={styles.metaValue}>{signedDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>IP address</Text>
              <Text style={styles.metaValue}>{signature.signer_ip ?? "—"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Agreed to terms</Text>
              <Text style={styles.metaValue}>{signature.agreed ? "Yes" : "No"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {MIDVORA_CONTACT.name} · {MIDVORA_CONTACT.address} · {MIDVORA_CONTACT.phone} ·{" "}
          {MIDVORA_CONTACT.email} — This document is a record of an electronically signed proposal.
        </Text>
      </Page>
    </Document>
  );
}

/** Render the signed proposal to a PDF Buffer (server-side). */
export async function renderSignedProposalPdf(
  proposal: Proposal,
  signature: Signature
): Promise<Buffer> {
  return renderToBuffer(<SignedProposalDoc proposal={proposal} signature={signature} />);
}
