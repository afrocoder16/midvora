import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function Home() {
  const current = await getCurrentUserProfile();

  if (!current) {
    redirect("/login");
  }

  redirect(current.profile.role === "admin" ? "/admin" : "/dashboard");
}
