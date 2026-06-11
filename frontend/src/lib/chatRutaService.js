import { apiFetch } from './apiClient';

export async function fetchConversaciones() {
  const res = await apiFetch('/api/chat/conversaciones');
  if (!res.ok) {
    throw new Error(res.error || `HTTP ${res.status}`);
  }
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function fetchMensajesRuta(rutaId) {
  const res = await apiFetch(`/api/chat/rutas/${rutaId}/mensajes`);
  if (!res.ok) {
    throw new Error(res.error || `HTTP ${res.status}`);
  }
  return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
}

export async function enviarMensajeRuta(rutaId, contenido) {
  const res = await apiFetch(`/api/chat/rutas/${rutaId}/mensajes`, {
    method: 'POST',
    json: { contenido },
  });
  if (!res.ok) {
    return { ok: false, message: res.error || `HTTP ${res.status}` };
  }
  return { ok: true, data: res.data };
}

export async function marcarChatLeido(rutaId) {
  const res = await apiFetch(`/api/chat/rutas/${rutaId}/leido`, {
    method: 'PATCH',
    json: {},
  });
  if (!res.ok) {
    return { ok: false, message: res.error || `HTTP ${res.status}` };
  }
  return { ok: true, data: res.data };
}
