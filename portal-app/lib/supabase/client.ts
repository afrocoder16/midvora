"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Uses the signed-in user's session and respects RLS.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
