import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  return res.error || res.data?.message || fallback;
}

/**
 * GET /api/rutas-plantilla
 * @param {{ nombre?: string, activa?: string }} [params]
 */
export async function getRutasPlantilla(params = {}) {
  const qs = new URLSearchParams();
  if (params.nombre?.trim()) qs.set("nombre", params.nombre.trim());
  if (params.activa !== undefined && params.activa !== "") {
    qs.set("activa", String(params.activa));
  }
  const query = qs.toString();
  const path = query ? `/api/rutas-plantilla?${query}` : "/api/rutas-plantilla";

  const res = await apiFetch(path);
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al obtener rutas plantilla") };
  }
  return { data: res.data };
}

export async function getRutaPlantillaById(id) {
  const res = await apiFetch(`/api/rutas-plantilla/${encodeURIComponent(id)}`);
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al obtener detalle") };
  }
  return { data: res.data };
}

export async function crearRutaPlantilla(payload) {
  const res = await apiFetch("/api/rutas-plantilla", {
    method: "POST",
    json: payload,
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al crear ruta plantilla") };
  }
  return { data: res.data };
}

export async function actualizarRutaPlantilla(id, payload) {
  const res = await apiFetch(`/api/rutas-plantilla/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: payload,
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al actualizar ruta plantilla") };
  }
  return { data: res.data };
}

export async function duplicarRutaPlantilla(id) {
  const res = await apiFetch(`/api/rutas-plantilla/${encodeURIComponent(id)}/duplicar`, {
    method: "POST",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al duplicar ruta plantilla") };
  }
  return { data: res.data };
}

export async function desactivarRutaPlantilla(id) {
  const res = await apiFetch(`/api/rutas-plantilla/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al desactivar ruta plantilla") };
  }
  return { data: res.data };
}

/**
 * POST /api/rutas-plantilla/calcular-ruta
 * @param {{ origen: string, destino: string, paradas?: Array<{ direccion: string, orden: number }> }} payload
 */
export async function calcularRutaPlantilla(payload) {
  const res = await apiFetch("/api/rutas-plantilla/calcular-ruta", {
    method: "POST",
    json: payload,
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al calcular ruta") };
  }
  return { data: res.data };
}
