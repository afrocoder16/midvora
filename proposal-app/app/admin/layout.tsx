import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

// Shared chrome for the authenticated admin area. The login page lives at
// /admin/login and opts out of this header by rendering its own full-screen layout
// (it has no nav needs); middleware guards access either way.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-cream">
      {/* Only show the header bar when authenticated (login page has no user). */}
      {user && (
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/admin" className="font-display text-xl font-bold text-brand-navy">
              Midvora <span className="text-muted-foreground">Proposals</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <form action="/admin/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
