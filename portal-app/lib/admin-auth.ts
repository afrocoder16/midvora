import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";

// Every admin page and server action calls this before using the service-role
// client. Middleware is useful defense in depth, but it is not the authority
// for privileged data access.
export async function requireAdmin() {
  const current = await getCurrentUserProfile();

  if (!current) {
    redirect("/login");
  }

  if (current.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return current;
}
