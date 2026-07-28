import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export type PortalRole = "admin" | "client";

export type PortalProfile = {
  id: string;
  role: PortalRole;
  client_id: string | null;
  full_name: string | null;
};

export type CurrentUserProfile = {
  user: {
    id: string;
    email: string | null;
  };
  profile: PortalProfile;
};

// Returns the authenticated user and their portal profile. A session without
// a matching profile row is unauthorized and returns null.
export const getCurrentUserProfile = cache(async (): Promise<CurrentUserProfile | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // This is only an early exit. Session identity is not trusted until the JWT
  // is validated by getClaims() below.
  if (!session) {
    return null;
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
    session.access_token
  );
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, client_id, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (
    error ||
    !profile ||
    (profile.role !== "admin" && profile.role !== "client")
  ) {
    return null;
  }

  return {
    user: {
      id: userId,
      email:
        typeof claimsData.claims.email === "string"
          ? claimsData.claims.email
          : null,
    },
    profile: {
      id: profile.id,
      role: profile.role,
      client_id: profile.client_id,
      full_name: profile.full_name,
    },
  };
});
