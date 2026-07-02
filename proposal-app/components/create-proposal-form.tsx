"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dollarsToCents, formatCents } from "@/lib/money";
import { ADMIN_CREATE_PROPOSAL_KIND, DEFAULT_PROPOSAL_TITLE } from "@/lib/proposal-kind";

export function CreateProposalForm() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientBusiness, setClientBusiness] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#1F5D2B");
  const [brandAccent, setBrandAccent] = useState("#F96B2B");
  const [proposalTitle, setProposalTitle] = useState(DEFAULT_PROPOSAL_TITLE);
  const [contractTotal, setContractTotal] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sourcePdfFile, setSourcePdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalCents = useMemo(() => dollarsToCents(contractTotal), [contractTotal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sourcePdfFile) {
      setError("Upload the finished proposal PDF.");
      return;
    }

    const line_items =
      totalCents > 0 ? [{ description: "Proposal total", price: totalCents }] : [];

    const payload = {
      proposal_kind: ADMIN_CREATE_PROPOSAL_KIND,
      client_name: clientName,
      client_business: clientBusiness,
      client_address: clientAddress,
      client_email: clientEmail,
      brand_primary: brandPrimary,
      brand_accent: brandAccent,
      proposal_title: proposalTitle,
      line_items,
    };

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    if (logoFile) formData.append("client_logo", logoFile);
    formData.append("source_pdf", sourcePdfFile);

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not create proposal.");
        setSubmitting(false);
        return;
      }
      setShareUrl(json.shareUrl);
      resetForm();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetForm() {
    setClientName("");
    setClientBusiness("");
    setClientAddress("");
    setClientEmail("");
    setBrandPrimary("#1F5D2B");
    setBrandAccent("#F96B2B");
    setProposalTitle(DEFAULT_PROPOSAL_TITLE);
    setContractTotal("");
    setLogoFile(null);
    setSourcePdfFile(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New PDF proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-7">
            <section className="rounded-card border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-brand-blue" />
                <div>
                  <p className="font-medium text-brand-navy">Uploaded PDF workflow</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload the finished proposal PDF. After the client signs, Midvora appends a
                    signed certificate page to the downloaded copy.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Client name" id="cn">
                <Input
                  id="cn"
                  value={clientName}
                  maxLength={200}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Business" id="cb">
                <Input
                  id="cb"
                  value={clientBusiness}
                  maxLength={200}
                  onChange={(e) => setClientBusiness(e.target.value)}
                />
              </Field>
              <Field label="Client email" id="ce">
                <Input
                  id="ce"
                  type="email"
                  value={clientEmail}
                  maxLength={320}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Client address" id="ca">
                <Input
                  id="ca"
                  value={clientAddress}
                  maxLength={300}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </Field>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Client logo" id="logo">
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="Primary color" id="primary">
                <Input
                  id="primary"
                  type="color"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                />
              </Field>
              <Field label="Accent color" id="accent">
                <Input
                  id="accent"
                  type="color"
                  value={brandAccent}
                  onChange={(e) => setBrandAccent(e.target.value)}
                />
              </Field>
              <Field label="Optional total" id="total">
                <Input
                  id="total"
                  placeholder="$0.00"
                  inputMode="decimal"
                  value={contractTotal}
                  onChange={(e) => setContractTotal(e.target.value)}
                />
              </Field>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Proposal title" id="title">
                <Input
                  id="title"
                  value={proposalTitle}
                  maxLength={200}
                  onChange={(e) => setProposalTitle(e.target.value)}
                />
              </Field>
              <Field label="Proposal PDF" id="source_pdf">
                <Input
                  id="source_pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSourcePdfFile(e.target.files?.[0] ?? null)}
                  required
                />
              </Field>
            </section>

            <div className="flex items-center justify-between rounded-card bg-blue-tint/50 px-4 py-3">
              <span className="font-medium text-brand-navy">Dashboard total</span>
              <span className="font-display text-xl font-bold text-brand-blue">
                {totalCents > 0 ? formatCents(totalCents) : "Optional"}
              </span>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create proposal & get link"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!shareUrl} onOpenChange={(open) => !open && setShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposal created</DialogTitle>
            <DialogDescription>
              Copy this link and send it to your client. Anyone with the link can view and sign it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl ?? ""} className="flex-1 font-mono text-xs" />
            <Button type="button" onClick={copyLink} variant={copied ? "accent" : "default"}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
