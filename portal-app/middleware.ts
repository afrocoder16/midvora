import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Refreshes the Supabase session cookie and blocks unauthenticated access.
// Role checks live in the guarded Server Components/actions so the same
// profiles row is not fetched once here and then again during rendering.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  const { pathname } = request.nextUrl;
  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";

    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie)
    );
    return redirectResponse;
  }

  if ((isDashboard || isAdminArea) && !userId) {
    return redirectTo("/login");
  }

  return response;
}

export const config = {
  // Only protected application routes need session refresh.
  // The login page and Next.js static assets remain public.
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
