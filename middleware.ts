import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Never crash the edge: if env is missing, let the page render;
  // server components handle their own auth gating.
  if (!url || !anon) return response;

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: CookieToSet[]) => {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;
    const publicAuth = ["/app/login", "/app/signup", "/app/forgot", "/app/reset"];
    const isProtected =
      path.startsWith("/app") && !publicAuth.some((entry) => path.startsWith(entry));
    if (isProtected && !user) {
      const login = request.nextUrl.clone();
      login.pathname = "/app/login";
      login.searchParams.set("next", path);
      return NextResponse.redirect(login);
    }
  } catch {
    // Auth check failed — fail open to the page, which will
    // show the logged-out state. Never 500 at the edge.
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
