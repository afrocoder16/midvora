"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Clients" },
  { href: "/admin/proposals", label: "Signings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] p-1"
    >
      {links.map((link) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin" || pathname.startsWith("/admin/clients")
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-brand-navy shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
