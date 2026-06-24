import { apiFetch } from "./apiClient";

function extractError(res, fallback) {
  if (res?.error) return res.error;
  const msg = res?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return fallback;
}

export async function obtenerCostosOperativos(rutaId) {
  const res = await apiFetch(
    `/api/rutas/${encodeURIComponent(rutaId)}/costos-operativos`,
  );
  if (!res.ok) {
    return { data: null, error: extractError(res, "Error al obtener costos operativos") };
  }
  return { data: res.data?.data ?? res.data, error: null };
}

export async function guardarCostosOperativos(rutaId, payload) {
  const res = await apiFetch(
    `/api/rutas/${encodeURIComponent(rutaId)}/costos-operativos`,
    { method: "PUT", json: payload },
  );
  if (!res.ok) {
    return { data: null, error: extractError(res, "Error al guardar costos") };
  }
  return { data: res.data?.data ?? res.data, error: null };
}

export async function congelarCostosOperativos(rutaId) {
  const res = await apiFetch(
    `/api/rutas/${encodeURIComponent(rutaId)}/costos-operativos/congelar`,
    { method: "POST" },
  );
  if (!res.ok) {
    return { data: null, error: extractError(res, "Error al congelar costos") };
  }
  return { data: res.data?.data ?? res.data, error: null };
}

export function formatCLP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}
