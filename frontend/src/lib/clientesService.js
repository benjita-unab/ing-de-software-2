import { apiFetch, getApiBaseUrl } from "./apiClient";

export async function createCliente(payload) {
  const res = await apiFetch("/api/clientes", {
    method: "POST",
    json: payload,
  });
  if (!res.ok) {
    throw new Error(res.error || "Error al crear cliente");
  }
  return res.data?.data ?? res.data;
}

export async function updateCliente(id, payload) {
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: "PUT",
    json: payload,
  });
  if (!res.ok) {
    throw new Error(res.error || "Error al actualizar cliente");
  }
  return res.data?.data ?? res.data;
}

export async function getClientes(query = "") {
  const url = query ? `/api/clientes?q=${encodeURIComponent(query)}` : "/api/clientes";
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(res.error || "Error al obtener clientes");
  }
  const payload = res.data;
  return Array.isArray(payload) ? payload : payload?.data ?? [];
}

export async function getHistorialDespachos(id) {
  const res = await apiFetch(`/api/clientes/${id}/despachos`);
  if (!res.ok) {
    throw new Error(res.error || "Error al obtener historial de despachos");
  }
  return res.data?.data ?? res.data ?? [];
}

/**
 * HU-60: plantillas de ruta adjudicadas a un cliente.
 */
export async function getPlantillasPorCliente(clienteId) {
  if (!clienteId) return { data: [], total: 0 };
  const res = await apiFetch(`/api/clientes/${encodeURIComponent(clienteId)}/rutas-plantilla`);
  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener plantillas del cliente" };
  }
  const payload = res.data;
  return {
    data: payload?.data ?? [],
    total: payload?.total ?? 0,
    error: null,
  };
}

/**
 * HU-60 CA-06: solicita recuperación de contraseña (sin JWT).
 */
export async function solicitarRecuperacionPassword(email) {
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "No se pudo solicitar la recuperación");
  }
  return payload;
}

/**
 * HU-60 CA-06: restablece contraseña con token (sin JWT).
 */
export async function restablecerPassword(token, newPassword) {
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.trim(), newPassword }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "No se pudo restablecer la contraseña");
  }
  return payload;
}

function generarPasswordTemporal() {
  const base = Math.random().toString(36).slice(-6);
  return `Lt${base}1!`;
}

export { generarPasswordTemporal };
