// src/lib/supabaseClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Instancia única del cliente Supabase para toda la app.
// Las variables de entorno se definen en tu archivo .env de React:
//   REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
//   REACT_APP_SUPABASE_ANON_KEY=eyJh...
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en tu .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20, // suficiente para el volumen de alertas
    },
  },
});
