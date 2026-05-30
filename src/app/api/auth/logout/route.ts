import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth-cookies";

export async function POST() {
  const names = authCookieNames();
  const cookieStore = await cookies();
  cookieStore.delete(names.access);
  cookieStore.delete(names.refresh);
  return NextResponse.json({ ok: true });
}
