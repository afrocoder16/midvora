import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. SERVER ONLY — bypasses Row Level Security.
// Used for all writes and for public token reads on the signing page.
// `server-only` guarantees a build error if this is ever imported into a
// client component.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
