"use client";

import { useState } from "react";
import { MidvoraBrand } from "@/components/midvora-brand";
import { PortalFooter } from "@/components/portal-footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabase();
    const {
      data: signInData,
      error: signInError,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signInData.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      (profile.role !== "admin" && profile.role !== "client")
    ) {
      await supabase.auth.signOut({ scope: "local" });
      setError("This account is not connected to the client portal.");
      setLoading(false);
      return;
    }

    window.location.replace(profile.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="relative overflow-hidden bg-brand-navy">
        <div className="absolute -right-16 -top-24 size-56 rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <MidvoraBrand theme="dark" label="Client portal" />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/45 sm:block">
            Secure portal access
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:py-24">
        <div className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-tint/60 blur-3xl" />
        <Card className="relative w-full max-w-md overflow-hidden border-brand-navy/10 shadow-[0_24px_70px_rgba(10,22,40,0.12)]">
          <div className="h-1 bg-gradient-to-r from-brand-blue to-brand-orange" />
          <CardHeader className="pb-5 pt-8">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Welcome back
            </span>
            <CardTitle className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-navy">
              Sign in to Midvora
            </CardTitle>
            <CardDescription>
              Use the portal account provided by our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 bg-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 bg-white"
                  required
                />
              </div>
              {error && (
                <p
                  className="rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <PortalFooter context="Client portal" />
    </div>
  );
}
