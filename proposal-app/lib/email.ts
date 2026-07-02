import "server-only";
import { Resend } from "resend";
import { formatCents } from "@/lib/money";
import { MIDVORA_CONTACT } from "@/components/brand-header";
import type { Proposal } from "@/lib/types";

// Sends the signed-proposal email with the PDF attached to BOTH the client and
// the internal Midvora inbox. Returns success/failure without throwing so a mail
// hiccup never blocks a successful signing.
export async function sendSignedProposalEmail({
  proposal,
  pdf,
}: {
  proposal: Proposal;
  pdf: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const internal = process.env.INTERNAL_NOTIFY_EMAIL ?? MIDVORA_CONTACT.email;

  if (!apiKey || !from) {
    return { ok: false, error: "Resend env not configured" };
  }

  const resend = new Resend(apiKey);
  const filename = `Midvora-Proposal-${proposal.client_name.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
  const attachments = [{ filename, content: pdf }];

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#111827; max-width:560px; margin:0 auto;">
      <div style="background:#0A1628; color:#fff; padding:20px 24px; border-radius:8px;">
        <div style="font-size:22px; font-weight:bold;">Midvora</div>
        <div style="font-size:12px; opacity:.75;">${MIDVORA_CONTACT.tagline}</div>
      </div>
      <p style="margin-top:20px;">Hi ${escapeHtml(proposal.client_name)},</p>
      <p>Thank you for signing your proposal with Midvora. A signed copy is attached as a PDF for your records.</p>
      ${
        proposal.total_price > 0
          ? `<p style="font-size:18px; font-weight:bold; color:#0054DF;">Total: ${formatCents(
              proposal.total_price
            )}</p>`
          : ""
      }
      <p>We'll be in touch shortly with next steps. If you have any questions, just reply to this email or call us.</p>
      <hr style="border:none; border-top:1px solid #E5E7EB; margin:24px 0;" />
      <p style="font-size:12px; color:#6B7280;">
        ${MIDVORA_CONTACT.name}<br/>
        ${MIDVORA_CONTACT.address}<br/>
        ${MIDVORA_CONTACT.phone} · ${MIDVORA_CONTACT.email}
      </p>
    </div>`;

  try {
    // Single send addressed to both client and internal inbox.
    const { error } = await resend.emails.send({
      from,
      to: [proposal.client_email, internal],
      subject: `Your signed Midvora proposal — ${proposal.client_name}`,
      html,
      attachments,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
