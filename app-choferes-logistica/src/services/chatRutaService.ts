import { bffFetch } from '@/src/services/bffService';

export type ChatRemitenteTipo = 'OPERADOR' | 'CONDUCTOR';

export interface ChatMensajeRuta {
  id: string;
  ruta_id: string;
  remitente_tipo: ChatRemitenteTipo;
  remitente_id: string;
  contenido: string;
  created_at: string;
  leido_at?: string | null;
}

export interface ChatConversacion {
  ruta_id: string;
  codigo_ruta: string;
  conductor: string | null;
  patente: string | null;
  ultimo_mensaje: string | null;
  fecha_ultimo_mensaje: string | null;
  cantidad_no_leidos: number;
}

async function parseJson<T>(res: Response): Promise<T | null> {
  return res.json().catch(() => null) as Promise<T | null>;
}

export async function fetchChatMensajesRuta(rutaId: string): Promise<ChatMensajeRuta[]> {
  const res = await bffFetch(`/api/chat/rutas/${rutaId}/mensajes`);
  const raw = await parseJson<ChatMensajeRuta[] | { data?: ChatMensajeRuta[] }>(res);
  if (!res.ok) {
    const msg =
      raw && typeof raw === 'object' && 'message' in raw
        ? String((raw as { message?: string }).message)
        : `HTTP ${res.status}`;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (Array.isArray(raw)) return raw;
  return raw?.data ?? [];
}

export async function enviarChatMensajeRuta(
  rutaId: string,
  contenido: string,
): Promise<ChatMensajeRuta> {
  const res = await bffFetch(`/api/chat/rutas/${rutaId}/mensajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contenido }),
  });
  const raw = await parseJson<ChatMensajeRuta | { message?: string }>(res);
  if (!res.ok) {
    const msg =
      raw && typeof raw === 'object' && 'message' in raw
        ? String(raw.message)
        : `HTTP ${res.status}`;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return raw as ChatMensajeRuta;
}

export async function marcarChatRutaLeido(rutaId: string): Promise<void> {
  const res = await bffFetch(`/api/chat/rutas/${rutaId}/leido`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const raw = await parseJson<{ message?: string }>(res);
    const msg = raw?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
}
