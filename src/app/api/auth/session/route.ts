import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth-cookies";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Token de acesso ausente." }, { status: 400 });
  }

  const names = authCookieNames();
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(names.access, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60
  });

  if (refreshToken) {
    cookieStore.set(names.refresh, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return NextResponse.json({ ok: true });
}
