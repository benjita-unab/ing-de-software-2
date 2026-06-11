import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  return res.error || res.data?.message || fallback;
}

/**
 * Indica si el usuario puede gestionar pagos de clientes (HU-34).
 * @param {string} [role]
 */
export function puedeGestionarPagosCliente(role) {
  const r = String(role || "").toUpperCase();
  return r === "OPERADOR" || r === "ADMIN";
}

/**
 * Indica si el usuario puede ver pagos de clientes.
 * @param {string} [role]
 */
export function puedeVerPagosCliente(role) {
  const r = String(role || "").toUpperCase();
  return r === "OPERADOR" || r === "ADMIN" || r === "CLIENTE";
}

/**
 * GET /api/pagos-cliente — todos los pagos (admin / operador).
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function getPagos() {
  const res = await apiFetch("/api/pagos-cliente");
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al obtener pagos") };
  }
  return { data: res.data };
}

/**
 * GET /api/pagos-cliente/:clienteId — pagos de un cliente.
 * @param {string} clienteId
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function getPagosCliente(clienteId) {
  const res = await apiFetch(`/api/pagos-cliente/${encodeURIComponent(clienteId)}`);
  if (!res.ok) {
    return {
      data: null,
      error: extractApiError(res, "Error al obtener pagos del cliente"),
    };
  }
  return { data: res.data };
}

/**
 * PATCH /api/pagos-cliente/:id/estado — PENDIENTE | PROCESANDO | PAGADO (operador/admin).
 * @param {string} pagoId
 * @param {{ estado: string, metodoPago?: string, referenciaTransaccion?: string }} payload
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function actualizarEstado(pagoId, payload) {
  const res = await apiFetch(`/api/pagos-cliente/${encodeURIComponent(pagoId)}/estado`, {
    method: "PATCH",
    json: payload,
  });
  if (!res.ok) {
    return {
      data: null,
      error: extractApiError(res, "Error al actualizar estado del pago"),
    };
  }
  return { data: res.data };
}
