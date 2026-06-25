"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignatureCanvas, type SignatureCanvasHandle } from "@/components/signature-canvas";
import { MIDVORA_CONTACT } from "@/components/brand-header";

interface Props {
  token: string;
  clientName: string;
}

// The signing experience: typed full name + agree checkbox + signature.
// Submit stays disabled until all three are satisfied.
export function SignForm({ token, clientName }: Props) {
  const router = useRouter();
  const sigRef = useRef<SignatureCanvasHandle>(null);

  const [name, setName] = useState(clientName ?? "");
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && agreed && hasSignature && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const signature_image = sigRef.current?.toDataURL();
    if (!signature_image) {
      setError("Please draw your signature.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signer_name: name.trim(),
          agreed: true,
          signature_image,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      // Re-render the page server-side: it will now show the signed/read-only view.
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-card border border-border bg-secondary/50 p-5 text-sm text-muted-foreground">
        By signing below, you agree to the scope and total above. {MIDVORA_CONTACT.name} will
        begin work as outlined. A signed PDF copy will be emailed to you and to{" "}
        {MIDVORA_CONTACT.email}.
      </div>

      <div className="space-y-2">
        <Label htmlFor="signer_name">Type your full legal name</Label>
        <Input
          id="signer_name"
          name="signer_name"
          autoComplete="name"
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Signature</Label>
        <SignatureCanvas ref={sigRef} onChange={setHasSignature} />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-card border border-input p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-input accent-brand-blue"
        />
        <span className="text-sm text-foreground">
          I have read and agree to these terms, and I am authorized to sign on behalf of the
          business named above.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className="w-full"
      >
        {submitting ? "Submitting…" : "Sign & accept proposal"}
      </Button>

      {!canSubmit && !submitting && (
        <p className="text-center text-xs text-muted-foreground">
          Type your name, draw your signature, and check the box to enable signing.
        </p>
      )}
    </form>
  );
}
