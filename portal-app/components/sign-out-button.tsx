"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserSupabase();

    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={signingOut}
      className={cn(className)}
    >
      {signingOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
