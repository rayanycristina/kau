import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  return NextResponse.json({
    profile: auth.profile,
    company: auth.company,
    membership: auth.membership,
    isPlatformAdmin: auth.isPlatformAdmin
  });
}
