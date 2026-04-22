import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export async function verifyToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    console.error("Error validando JWT con Supabase:", error);
    throw new Error("Invalid JWT");
  }

  return data.user;
}
