import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));
}

export function getSupabaseServerClient() {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
