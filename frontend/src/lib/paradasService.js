// src/lib/paradasService.js
// ─────────────────────────────────────────────────────────────────────────────
// HU-61: Servicio de gestión de paradas intermedias.
// Todos los endpoints apuntan al backend NestJS; no accedemos Supabase directo.
// ─────────────────────────────────────────────────────────────────────────────

import { apiFetch } from "./apiClient";

const base = (rutaId) => `/api/rutas/${encodeURIComponent(rutaId)}/paradas`;

/**
 * Lista todas las paradas de una ruta ordenadas por campo `orden`.
 * @param {string} rutaId
 * @returns {Promise<{ data: Array, error?: string }>}
 */
export async function obtenerParadas(rutaId) {
  if (!rutaId) return { data: [], error: "rutaId es requerido" };

  const res = await apiFetch(base(rutaId));
  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener paradas" };
  }

  const payload = res.data;
  return { data: Array.isArray(payload) ? payload : payload?.data ?? [] };
}

/**
 * Crea una nueva parada intermedia en la ruta.
 * @param {string} rutaId
 * @param {{ direccion: string, lat?: number, lng?: number, tipo_parada?: string, orden?: number }} body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function crearParada(rutaId, body) {
  if (!rutaId) return { success: false, error: "rutaId es requerido" };
  if (!body?.direccion?.trim()) {
    return { success: false, error: "La dirección es obligatoria" };
  }

  const res = await apiFetch(base(rutaId), {
    method: "POST",
    json: body,
  });

  if (!res.ok) {
    return { success: false, error: res.error || "No se pudo crear la parada" };
  }

  return { success: true, data: res.data?.data ?? res.data };
}

/**
 * Edita una parada existente.
 * @param {string} rutaId
 * @param {string} paradaId
 * @param {{ direccion?: string, lat?: number, lng?: number, tipo_parada?: string }} body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function editarParada(rutaId, paradaId, body) {
  if (!rutaId || !paradaId) {
    return { success: false, error: "rutaId y paradaId son requeridos" };
  }

  const res = await apiFetch(`${base(rutaId)}/${encodeURIComponent(paradaId)}`, {
    method: "PATCH",
    json: body,
  });

  if (!res.ok) {
    return { success: false, error: res.error || "No se pudo editar la parada" };
  }

  return { success: true, data: res.data?.data ?? res.data };
}

/**
 * Elimina una parada de la ruta.
 * @param {string} rutaId
 * @param {string} paradaId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function eliminarParada(rutaId, paradaId) {
  if (!rutaId || !paradaId) {
    return { success: false, error: "rutaId y paradaId son requeridos" };
  }

  const res = await apiFetch(`${base(rutaId)}/${encodeURIComponent(paradaId)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    return { success: false, error: res.error || "No se pudo eliminar la parada" };
  }

  return { success: true };
}

/**
 * Reordena las paradas de una ruta (Task #521).
 * @param {string} rutaId
 * @param {Array<{ id: string, orden: number }>} paradas — array con el nuevo orden completo
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function reordenarParadas(rutaId, paradas) {
  if (!rutaId) return { success: false, error: "rutaId es requerido" };
  if (!Array.isArray(paradas) || paradas.length === 0) {
    return { success: false, error: "paradas debe ser un array no vacío" };
  }

  const res = await apiFetch(`${base(rutaId)}/reorder`, {
    method: "PATCH",
    json: { paradas },
  });

  if (!res.ok) {
    return { success: false, error: res.error || "No se pudo reordenar las paradas" };
  }

  return { success: true, data: res.data?.data ?? res.data };
}

/**
 * Fuerza el recálculo de distancia total de la ruta con sus paradas (Task #523).
 * @param {string} rutaId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function recalcularDistancia(rutaId) {
  if (!rutaId) return { success: false, error: "rutaId es requerido" };

  const res = await apiFetch(`${base(rutaId)}/recalcular`, {
    method: "PATCH",
  });

  if (!res.ok) {
    return { success: false, error: res.error || "No se pudo recalcular la distancia" };
  }

  return { success: true, data: res.data?.data ?? res.data };
}
