import { apiFetch } from "./apiClient";

function extractApiError(res, fallback) {
  return res.error || res.data?.message || fallback;
}

export const DASHBOARD_PERIODO_PRESETS = [
  { value: "1m", label: "Último mes", months: 1 },
  { value: "3m", label: "Últimos 3 meses", months: 3 },
  { value: "6m", label: "Últimos 6 meses", months: 6 },
  { value: "1y", label: "Último año", months: 12 },
];

export function resolveDashboardPeriodoRange(preset) {
  const config = DASHBOARD_PERIODO_PRESETS.find((p) => p.value === preset);
  const months = config?.months ?? 1;
  const hasta = new Date();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - months);
  return {
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
  };
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
