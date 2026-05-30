import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const { profile, response } = await requireAuth();
  if (response || !profile) return response;
  return NextResponse.json({ profile });
}
