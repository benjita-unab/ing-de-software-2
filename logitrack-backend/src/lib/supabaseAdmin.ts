import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Cliente de Supabase inicializado con SERVICE_ROLE_KEY.
 * Bypassa el RLS. Úsalo SOLO en el servidor, NUNCA lo expongas al cliente.
 */
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
