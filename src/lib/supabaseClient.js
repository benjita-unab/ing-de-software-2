// src/lib/supabaseClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Instancia única del cliente Supabase para toda la app.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en tu .env"
  );
}

const normalizedSupabaseUrl = supabaseUrl.replace(".supabase.com", ".supabase.co");

if (supabaseUrl !== normalizedSupabaseUrl) {
  // Ayuda para evitar errores de DNS por dominio mal escrito en .env
  console.warn(
    "[Supabase] Se detectó dominio .supabase.com; usando .supabase.co automáticamente."
  );
}

export const supabase = createClient(normalizedSupabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
