import { redirect } from "next/navigation";

// The app root has no public landing page; send visitors to the admin area
// (which itself redirects to login when unauthenticated).
export default function Home() {
  redirect("/admin");
}
