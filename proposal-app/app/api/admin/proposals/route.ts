import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProposalSchema } from "@/lib/validation";
import { generateProposalToken } from "@/lib/token";
import { sumLineItems } from "@/lib/money";

export const runtime = "nodejs";

// POST /api/admin/proposals — create a draft proposal (admin only).
export async function POST(req: NextRequest) {
  // AuthZ: must be a logged-in admin (Supabase Auth session).
  const authed = await createServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createProposalSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 400 });
  }
  const { client_name, client_business, client_email, line_items } = parsed.data;

  const total_price = sumLineItems(line_items);
  const token = generateProposalToken();

  // Use the service-role client to insert (RLS allows no direct writes).
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      token,
      client_name,
      client_business: client_business || null,
      client_email,
      line_items,
      total_price,
      status: "draft",
    })
    .select("id, token")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not create proposal." }, { status: 500 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const shareUrl = `${base.replace(/\/$/, "")}/proposal/${data.token}`;

  return NextResponse.json({ id: data.id, token: data.token, shareUrl }, { status: 201 });
}
