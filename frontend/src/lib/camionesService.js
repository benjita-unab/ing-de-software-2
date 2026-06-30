import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  const raw = res?.data?.message ?? res?.error;
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "string" && raw.trim()) return raw;
  return fallback;
}

function unwrapData(payload) {
  if (payload?.data && typeof payload.data === "object" && payload.data.id) {
    return payload.data;
  }
  if (payload?.id) return payload;
  return payload?.data ?? payload;
}

/**
 * Lista camiones activos desde GET /api/camiones.
 * @param {object} [params]
 * @returns {Promise<{ data: array, meta?: object, error?: string }>}
 */
export async function obtenerCamiones(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.search) qs.set("search", params.search);
  if (params.estado) qs.set("estado", params.estado);
  if (params.orden) qs.set("orden", params.orden);

  const qString = qs.toString();
  const url = qString ? `/api/camiones?${qString}` : "/api/camiones";

  const res = await apiFetch(url);

  if (!res.ok) {
    return { data: [], error: extractApiError(res, "Error al obtener camiones") };
  }

  const payload = res.data;
  const data = Array.isArray(payload) ? payload : payload?.data ?? [];
  const meta = payload?.meta;

  return meta ? { data, meta } : { data };
}

/**
 * @param {string} id
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function obtenerCamionDetalle(id) {
  if (!id) return { data: null, error: "id es requerido" };

  const res = await apiFetch(`/api/camiones/${id}`);

  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al obtener camión") };
  }

  return { data: unwrapData(res.data) };
}

/**
 * @param {object} payload
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function crearCamion(payload) {
  const res = await apiFetch("/api/camiones", {
    method: "POST",
    json: payload,
  });

  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al crear camión") };
  }

  return { data: unwrapData(res.data) };
}

/**
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function actualizarCamion(id, payload) {
  if (!id) return { data: null, error: "id es requerido" };

  const res = await apiFetch(`/api/camiones/${id}`, {
    method: "PATCH",
    json: payload,
  });

  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al actualizar camión") };
  }

  return { data: unwrapData(res.data) };
}

/**
 * @param {string} id
 * @param {string} proxima_mantencion - ISO date YYYY-MM-DD
 * @returns {Promise<{ data: object|null, error?: string }>}
 */
export async function registrarRevisionTecnica(id, proxima_mantencion) {
  if (!id) return { data: null, error: "id es requerido" };

  const res = await apiFetch(`/api/camiones/${id}/revision-tecnica`, {
    method: "PATCH",
    json: { proxima_mantencion },
  });

  if (!res.ok) {
    return {
      data: null,
      error: extractApiError(res, "Error al registrar revisión técnica"),
    };
  }

  return { data: unwrapData(res.data) };
}
