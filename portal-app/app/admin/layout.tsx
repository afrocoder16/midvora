import { AdminNav } from "@/components/admin-nav";
import { MidvoraBrand } from "@/components/midvora-brand";
import { PortalFooter } from "@/components/portal-footer";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="relative overflow-hidden bg-brand-navy text-white shadow-[0_8px_30px_rgba(10,22,40,0.12)]">
        <div className="absolute -right-20 -top-24 size-64 rounded-full bg-brand-blue/15 blur-3xl" />
        <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-5">
            <MidvoraBrand href="/admin" theme="dark" label="Admin portal" />
            <AdminNav />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden max-w-56 truncate text-sm text-white/50 lg:inline">
              {current.user.email}
            </span>
            <SignOutButton className="border-white/15 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <PortalFooter context="Admin portal" />
    </div>
  );
}
