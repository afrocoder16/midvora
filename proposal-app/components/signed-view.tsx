import { Button } from "@/components/ui/button";
import type { Signature } from "@/lib/types";

// Shown once a proposal is signed: the signature block + a download button.
// (The download button is a plain anchor to the PDF endpoint so it works even
// with JS disabled.)
export function SignedView({
  token,
  signature,
}: {
  token: string;
  signature: Signature;
}) {
  const signedDate = new Date(signature.signed_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-card border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        This proposal was signed and accepted.
      </div>

      <div className="rounded-card border border-border p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Signature
        </p>
        <div className="mt-3 w-full max-w-sm rounded-md border border-input bg-white p-2">
          {/* signature_image is a base64 data URL */}
          <img
            src={signature.signature_image}
            alt={`Signature of ${signature.signer_name}`}
            className="h-28 w-full object-contain"
          />
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Signed by</dt>
            <dd className="font-medium text-foreground">{signature.signer_name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date &amp; time</dt>
            <dd className="font-medium text-foreground">
              {signedDate.toLocaleString("en-US", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </dd>
          </div>
          {signature.signer_ip && (
            <div>
              <dt className="text-muted-foreground">IP address</dt>
              <dd className="font-medium text-foreground">{signature.signer_ip}</dd>
            </div>
          )}
        </dl>
      </div>

      <Button asChild size="lg" className="w-full">
        <a href={`/api/proposal/${token}/pdf`} download>
          Download signed PDF
        </a>
      </Button>
    </div>
  );
}
