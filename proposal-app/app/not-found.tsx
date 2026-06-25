import { MIDVORA_CONTACT } from "@/components/brand-header";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-5xl font-bold text-brand-navy">Midvora</p>
        <h1 className="mt-6 text-xl font-semibold text-foreground">
          This proposal link isn’t valid.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be mistyped or expired. If you believe this is an error, reach out and
          we’ll send you a fresh link.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          {MIDVORA_CONTACT.email} · {MIDVORA_CONTACT.phone}
        </p>
      </div>
    </main>
  );
}
