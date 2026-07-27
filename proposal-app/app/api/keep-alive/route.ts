import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorJson } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return errorJson("Unauthorized.", 401);
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("proposals")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("[keep-alive] database check failed:", error);
      return errorJson("Database check failed.", 500);
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[keep-alive] database check failed:", error);
    return errorJson("Database check failed.", 500);
  }
}
