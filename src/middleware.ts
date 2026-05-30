import { NextResponse, type NextRequest } from "next/server";
import { authCookieNames } from "@/lib/auth-cookies";

const publicPrefixes = [
  "/login",
  "/api/auth/session",
  "/api/auth/logout",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.json"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const hasToken = Boolean(request.cookies.get(authCookieNames().access)?.value);

  if (!hasToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Login obrigatório." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
