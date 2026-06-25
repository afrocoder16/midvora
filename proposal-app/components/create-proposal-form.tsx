"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { dollarsToCents, formatCents, sumLineItems } from "@/lib/money";

interface DraftItem {
  description: string;
  price: string; // raw dollar text the admin types
}

export function CreateProposalForm() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [clientBusiness, setClientBusiness] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ description: "", price: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalCents = useMemo(
    () => sumLineItems(items.map((i) => ({ price: dollarsToCents(i.price) }))),
    [items]
  );

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", price: "" }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const line_items = items
      .map((i) => ({ description: i.description.trim(), price: dollarsToCents(i.price) }))
      .filter((i) => i.description.length > 0);

    if (line_items.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_business: clientBusiness,
          client_email: clientEmail,
          line_items,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not create proposal.");
        setSubmitting(false);
        return;
      }
      setShareUrl(json.shareUrl);
      // Reset the form for the next one.
      setClientName("");
      setClientBusiness("");
      setClientEmail("");
      setItems([{ description: "", price: "" }]);
      router.refresh(); // refresh the list below
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cn">Client name</Label>
                <Input id="cn" value={clientName} maxLength={200} onChange={(e) => setClientName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cb">Business (optional)</Label>
                <Input id="cb" value={clientBusiness} maxLength={200} onChange={(e) => setClientBusiness(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ce">Client email</Label>
              <Input id="ce" type="email" value={clientEmail} maxLength={320} onChange={(e) => setClientEmail(e.target.value)} required />
            </div>

            <div className="space-y-3">
              <Label>Line items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Input
                    placeholder="Description (e.g. 5-page custom website)"
                    value={item.description}
                    maxLength={500}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="$0.00"
                    inputMode="decimal"
                    value={item.price}
                    onChange={(e) => updateItem(idx, { price: e.target.value })}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    aria-label="Remove line item"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" /> Add line item
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-card bg-blue-tint/50 px-4 py-3">
              <span className="font-medium text-brand-navy">Running total</span>
              <span className="font-display text-xl font-bold text-brand-blue">
                {formatCents(totalCents)}
              </span>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create proposal & get link"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Share-link modal shown after a successful create. */}
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
