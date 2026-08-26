import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth/callback", "/api/auth/logout"];
const sellerHomePath = "/sales";

function isPublicPath(pathname: string) {
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  if (user && !pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return response;

    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const [{ data: profile }, { data: membership }, { data: platformAdmin }] = await Promise.all([
      admin.from("user_profiles").select("is_active").eq("id", user.id).maybeSingle(),
      admin.from("company_memberships").select("role,is_active,companies(status)").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      admin.from("platform_admins").select("is_active").eq("user_id", user.id).eq("is_active", true).maybeSingle()
    ]);

    const company = Array.isArray(membership?.companies) ? membership.companies[0] : membership?.companies;
    const companyActive = profile?.is_active && membership?.is_active && company?.status === "active";
    const isActiveAdmin = companyActive && (membership?.role === "owner" || membership?.role === "admin");
    const isActiveSeller = companyActive && (membership?.role === "seller" || membership?.role === "member");

    if (!companyActive && !pathname.startsWith("/company-suspended") && !(pathname.startsWith("/platform") && platformAdmin?.is_active)) {
      const unavailableUrl = request.nextUrl.clone();
      unavailableUrl.pathname = "/company-suspended";
      unavailableUrl.search = "";
      return NextResponse.redirect(unavailableUrl);
    }
    if (companyActive && pathname.startsWith("/company-suspended")) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }

    if (isActiveSeller && !pathname.startsWith(sellerHomePath)) {
      const salesUrl = request.nextUrl.clone();
      salesUrl.pathname = sellerHomePath;
      salesUrl.search = "";
      return NextResponse.redirect(salesUrl);
    }

    if ((pathname.startsWith("/admin") || pathname.startsWith("/finance") || pathname.startsWith("/products") || pathname.startsWith("/expedition")) && !isActiveAdmin) {
      const salesUrl = request.nextUrl.clone();
      salesUrl.pathname = sellerHomePath;
      salesUrl.search = "";
      return NextResponse.redirect(salesUrl);
    }
    if (pathname.startsWith("/platform") && !platformAdmin?.is_active) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
