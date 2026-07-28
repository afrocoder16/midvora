import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Ends the current Supabase session and returns to the public login page.
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
