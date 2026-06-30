import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  return res.error || res.data?.message || fallback;
}

/**
 * @param {{ clienteId?: string, desde?: string, hasta?: string }} [filters]
 */
export function buildRentabilidadResumenUrl(filters = {}) {
  const params = new URLSearchParams();
  if (filters.clienteId?.trim()) params.set("clienteId", filters.clienteId.trim());
  if (filters.desde?.trim()) params.set("desde", filters.desde.trim());
  if (filters.hasta?.trim()) params.set("hasta", filters.hasta.trim());
  const qs = params.toString();
  return qs
    ? `/api/dashboard/rentabilidad/resumen?${qs}`
    : "/api/dashboard/rentabilidad/resumen";
}

/**
 * GET /api/dashboard/rentabilidad/resumen
 * @param {{ clienteId?: string, desde?: string, hasta?: string }} [filters]
 */
export async function getDashboardRentabilidadResumen(filters = {}) {
  const res = await apiFetch(buildRentabilidadResumenUrl(filters));
  if (!res.ok) {
    return {
      data: null,
      error: extractApiError(res, "No fue posible cargar el resumen de rentabilidad"),
    };
  }
  return { data: res.data, error: null };
}
