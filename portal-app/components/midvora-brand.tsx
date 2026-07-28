import Link from "next/link";
import { cn } from "@/lib/utils";

type MidvoraBrandProps = {
  href?: string;
  label?: string;
  theme?: "dark" | "light";
  className?: string;
};

export function MidvoraBrand({
  href = "/",
  label,
  theme = "light",
  className,
}: MidvoraBrandProps) {
  const isDark = theme === "dark";

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
        isDark && "focus-visible:ring-offset-brand-navy",
        className
      )}
      aria-label={label ? `Midvora ${label}` : "Midvora"}
    >
      <span
        className={cn(
          "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5",
          isDark
            ? "border-white/15 bg-white/10"
            : "border-brand-navy/10 bg-brand-navy"
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 36" className="size-7" fill="none">
          <path
            d="M7 26V10l11 11 11-11v16"
            stroke="white"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 21.5c7.8-5 18.2-5 26 0"
            stroke="#2D7DFF"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <circle cx="18" cy="7" r="2" fill="#F96B2B" />
        </svg>
      </span>

      <span className="min-w-0 leading-none">
        <span
          className={cn(
            "block font-display text-xl font-semibold uppercase tracking-[0.12em]",
            isDark ? "text-white" : "text-brand-navy"
          )}
        >
          Midvora
        </span>
        {label && (
          <span
            className={cn(
              "mt-1 block truncate text-[0.65rem] font-semibold uppercase tracking-[0.2em]",
              isDark ? "text-white/55" : "text-brand-blue"
            )}
          >
            {label}
          </span>
        )}
      </span>
    </Link>
  );
}
