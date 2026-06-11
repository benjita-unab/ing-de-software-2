import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: any = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase credentials not configured in Expo environment");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

/**
 * Consulta el listado inicial de rutas con sus bultos para el cliente.
 */
export async function obtenerRutasCliente(clienteId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rutas')
    .select(`
      *,
      bultos (*)
    `)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error obteniendo rutas del cliente:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

/**
 * Suscripción en Tiempo Real (Supabase Realtime Channels)
 * Escucha eventos de la tabla rutas para el cliente actual.
 */
export function suscribirseARutasCliente(
  clienteId: string,
  onEvent: (payload: any) => void
) {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`cliente-rutas-${clienteId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Escuchar INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'rutas',
        filter: `cliente_id=eq.${clienteId}`
      },
      (payload: any) => {
        console.log('Cambio detectado en tiempo real en rutas:', payload);
        onEvent(payload);
      }
    )
    .subscribe((status: string) => {
      console.log(`Estado de canal realtime rutas: ${status}`);
    });

  return () => {
    console.log('Cancelando suscripción realtime rutas');
    supabase.removeChannel(channel);
  };
}
