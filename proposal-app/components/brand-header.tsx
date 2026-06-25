// Lightweight Midvora wordmark + tagline header shared across pages.
export function BrandHeader({ subtle = false }: { subtle?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`font-display text-2xl font-bold tracking-tight ${
          subtle ? "text-white" : "text-brand-navy"
        }`}
      >
        Midvora
      </span>
      <span
        className={`text-xs font-medium ${subtle ? "text-white/70" : "text-muted-foreground"}`}
      >
        Midwest Light. Modern Websites for Local Business.
      </span>
    </div>
  );
}

export const MIDVORA_CONTACT = {
  name: "Midvora",
  address: "107 E Main, Marshall, MN 56258",
  phone: "(507) 530-4837",
  email: "info@Midvora.com",
  tagline: "Midwest Light. Modern Websites for Local Business.",
} as const;
