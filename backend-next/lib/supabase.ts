import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

let adminClient: any = null;
let authClient: any = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return adminClient;
}

export function getSupabaseAuthClient() {
  if (!authClient) {
    authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return authClient;
}
