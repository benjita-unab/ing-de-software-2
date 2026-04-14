// src/lib/supabaseClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente Supabase para Backend - Utiliza Service Key para operaciones de servidor
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Faltan las variables SUPABASE_URL y SUPABASE_SERVICE_KEY en tu archivo .env"
  );
}

// El service key permite acceso total a la BD, ideal para operaciones de servidor
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export default supabase;
