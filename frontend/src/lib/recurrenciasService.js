import { apiFetch, getAuthToken } from "./apiClient";

function extractApiError(res, fallback) {
  if (res?.error) return res.error;
  const msg = res?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  return fallback;
}

function parseJwtPayload(token) {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Normaliza el body antes de POST: frecuencia en minúsculas y cliente_id UUID.
 */
export function buildRecurrenciaPayload(raw = {}) {
  const frecuencia = String(raw.frecuencia || "semanal").trim().toLowerCase();
  const validFrecuencias = ["diaria", "semanal", "mensual"];

  let clienteId =
    raw.cliente_id?.trim() ||
    raw.clienteId?.trim() ||
    null;

  if (!isUuid(clienteId)) {
    const token = getAuthToken();
    const jwtClienteId = token ? parseJwtPayload(token)?.clienteId : null;
    if (isUuid(jwtClienteId)) {
      clienteId = jwtClienteId.trim();
    }
  }

  const payload = {
    cliente_id: clienteId,
    frecuencia: validFrecuencias.includes(frecuencia) ? frecuencia : "semanal",
    intervalo: Math.max(1, Number(raw.intervalo) || 1),
    hora_ejecucion: raw.hora_ejecucion || "08:00:00",
    fecha_inicio: raw.fecha_inicio,
  };

  if (raw.fecha_fin?.trim()) {
    payload.fecha_fin = raw.fecha_fin.trim();
  }

  const rutaOrigenId = raw.ruta_origen_id?.trim() || raw.rutaOrigenId?.trim();
  const rutaPlantillaId =
    raw.ruta_plantilla_id?.trim() || raw.rutaPlantillaId?.trim();

  if (rutaOrigenId) payload.ruta_origen_id = rutaOrigenId;
  if (rutaPlantillaId) payload.ruta_plantilla_id = rutaPlantillaId;

  if (payload.frecuencia === "semanal") {
    payload.dia_semana = Number(raw.dia_semana) || 1;
  }
  if (payload.frecuencia === "mensual") {
    payload.dia_mes = Number(raw.dia_mes) || 1;
  }

  return payload;
}

/** POST /api/recurrencias */
export async function crearRecurrencia(payload) {
  const body = buildRecurrenciaPayload(payload);

  if (!isUuid(body.cliente_id)) {
    return {
      data: null,
      error: "cliente_id inválido o ausente. Seleccione un cliente válido.",
    };
  }

  const res = await apiFetch("/api/recurrencias", {
    method: "POST",
    json: body,
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al crear recurrencia") };
  }
  return { data: res.data, error: null };
}

/** GET /api/recurrencias */
export async function getRecurrencias(params = {}) {
  const query = new URLSearchParams();
  if (params.clienteId) query.set("clienteId", params.clienteId);
  if (params.estado) query.set("estado", params.estado);
  if (params.incluirProximas) query.set("incluirProximas", "true");
  const path = query.toString()
    ? `/api/recurrencias?${query.toString()}`
    : "/api/recurrencias";
  const res = await apiFetch(path);
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al listar recurrencias") };
  }
  return { data: res.data, error: null };
}

/** GET /api/recurrencias/proximos */
export async function getRecurrenciasProximas(clienteId) {
  const query = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : "";
  const res = await apiFetch(`/api/recurrencias/proximos${query}`);
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al obtener próximos pedidos") };
  }
  return { data: res.data, error: null };
}

export async function pausarRecurrencia(id) {
  const res = await apiFetch(`/api/recurrencias/${encodeURIComponent(id)}/pausar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al pausar recurrencia") };
  }
  return { data: res.data, error: null };
}

export async function reanudarRecurrencia(id) {
  const res = await apiFetch(`/api/recurrencias/${encodeURIComponent(id)}/reanudar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al reanudar recurrencia") };
  }
  return { data: res.data, error: null };
}

export async function cancelarRecurrencia(id) {
  const res = await apiFetch(`/api/recurrencias/${encodeURIComponent(id)}/cancelar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al cancelar recurrencia") };
  }
  return { data: res.data, error: null };
}

/** Portal cliente — GET /api/portal/recurrencias */
export async function getPortalRecurrencias() {
  const res = await apiFetch("/api/portal/recurrencias");
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al cargar recurrencias") };
  }
  return { data: res.data, error: null };
}

export async function crearPortalRecurrencia(payload) {
  const body = buildRecurrenciaPayload(payload);

  if (!isUuid(body.cliente_id)) {
    return {
      data: null,
      error:
        "No se pudo identificar su cliente. Cierre sesión y vuelva a entrar al portal.",
    };
  }

  const res = await apiFetch("/api/portal/recurrencias", {
    method: "POST",
    json: body,
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al crear recurrencia") };
  }
  return { data: res.data, error: null };
}

export async function pausarPortalRecurrencia(id) {
  const res = await apiFetch(`/api/portal/recurrencias/${encodeURIComponent(id)}/pausar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al pausar") };
  }
  return { data: res.data, error: null };
}

export async function reanudarPortalRecurrencia(id) {
  const res = await apiFetch(`/api/portal/recurrencias/${encodeURIComponent(id)}/reanudar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al reanudar") };
  }
  return { data: res.data, error: null };
}

export async function cancelarPortalRecurrencia(id) {
  const res = await apiFetch(`/api/portal/recurrencias/${encodeURIComponent(id)}/cancelar`, {
    method: "PATCH",
  });
  if (!res.ok) {
    return { data: null, error: extractApiError(res, "Error al cancelar") };
  }
  return { data: res.data, error: null };
}

export const FRECUENCIAS = [
  { value: "diaria", label: "Diaria" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
];

export const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];
