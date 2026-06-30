import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  return res.error || res.data?.message || fallback;
}

/**
 * @param {{ clienteId?: string, desde?: string, hasta?: string }} [filters]
 */
export function buildFinancieroResumenUrl(filters = {}) {
  const params = new URLSearchParams();
  if (filters.clienteId?.trim()) params.set("clienteId", filters.clienteId.trim());
  if (filters.desde?.trim()) params.set("desde", filters.desde.trim());
  if (filters.hasta?.trim()) params.set("hasta", filters.hasta.trim());
  const qs = params.toString();
  return qs
    ? `/api/dashboard/financiero/resumen?${qs}`
    : "/api/dashboard/financiero/resumen";
}

/**
 * GET /api/dashboard/financiero/resumen
 * @param {{ clienteId?: string, desde?: string, hasta?: string }} [filters]
 */
export async function getDashboardFinancieroResumen(filters = {}) {
  const res = await apiFetch(buildFinancieroResumenUrl(filters));
  if (!res.ok) {
    return {
      data: null,
      error: extractApiError(res, "No fue posible cargar el resumen financiero"),
    };
  }
  return { data: res.data, error: null };
}
