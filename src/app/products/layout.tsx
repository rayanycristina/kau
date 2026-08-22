import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

export default async function ProductsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/products");
  if (!hasSupabaseAdminConfig()) redirect("/sales");

  const { data: profile } = await getSupabaseAdminClient()
    .from("user_profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.is_active) redirect("/sales");

  return children;
}
