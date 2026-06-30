// src/lib/rutasService.js
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// Servicio para gestión de rutas y asignación de conductores con validación
// de licencias (HU-5 CA-3).
//
// Toda la lógica crítica pasa por el backend NestJS a través de `apiFetch`.
// No accedemos a Supabase directamente desde el frontend.
// ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

import { apiFetch } from "./apiClient";
import {
  parseRutasPayload,
  rutaAsignadaAConductor,
} from "./conductorUtils";

/**
 * Crea un pedido/ruta operativa (POST /api/rutas) — HU-58.
 * @param {object} payload — cliente_id, origen, destino, conductor_id, camion_id, fecha_inicio;
 *   opcionales: ruta_plantilla_id, paradas[], observaciones, guardar_como_plantilla.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function crearRuta(payload) {
  if (!payload?.cliente_id || !payload?.origen || !payload?.destino) {
    return {
      success: false,
      error: "cliente_id, origen y destino son obligatorios",
    };
  }

  const camionId = String(payload?.camion_id ?? "").trim();

  if (!camionId) {
    return { success: false, error: "Debe seleccionar un camión." };
  }

  const res = await apiFetch("/api/rutas", {
    method: "POST",
    json: payload,
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "No se pudo crear la ruta",
    };
  }

  return { success: true, data: res.data };
}

/**
 * Valida que un conductor tenga licencia vigente.
 * @param {string} conductorId - ID del conductor
 * @returns {Promise<{isValid: boolean, errorMessage?: string, conductor?: object}>}
 */
export async function validarLicenciaConductor(conductorId) {
  if (!conductorId) {
    return {
      isValid: false,
      errorMessage: "ID del conductor es requerido",
    };
  }

  const res = await apiFetch(`/api/conductores/${conductorId}/license-status`);

  if (!res.ok) {
    return {
      isValid: false,
      errorMessage: res.error || "Error al consultar conductor",
    };
  }

  const status = res.data || {};
  return {
    isValid: !!status.isValid,
    errorMessage: status.isValid ? undefined : status.message,
    conductor: status,
  };
}

/**
 * Asigna un conductor a una ruta después de validar su licencia.
 * @param {string} rutaId - ID de la ruta
 * @param {string} conductorId - ID del conductor
 * @param {string} camionId - ID del camión
 * @param {number} [cargaRequeridaKg] - Carga opcional para validar capacidad
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function asignarConductorARuta(
  rutaId,
  conductorId,
  camionId,
  cargaRequeridaKg,
) {
  if (!rutaId || !conductorId) {
    return {
      success: false,
      error: "rutaId y conductorId son requeridos",
    };
  }

  const body = { rutaId, conductorId };
  if (camionId) body.camionId = camionId;
  if (typeof cargaRequeridaKg === "number" && cargaRequeridaKg > 0) {
    body.cargaRequeridaKg = cargaRequeridaKg;
  }

  const res = await apiFetch(`/api/rutas/assign`, {
    method: "POST",
    json: body,
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "Error al asignar ruta",
    };
  }

  return {
    success: true,
    data: res.data?.data ?? res.data,
  };
}

/**
 * Obtiene todas las rutas sin conductor asignado.
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerRutasSinAsignar() {
  const res = await apiFetch(`/api/rutas/unassigned`);

  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener rutas" };
  }

  const payload = res.data;
  const data = Array.isArray(payload) ? payload : payload?.data ?? [];
  return { data };
}

/**
 * Obtiene los conductores activos con su estado de licencia.
 * @param {object} [params]
 * @returns {Promise<{data: array, meta?: object, error?: string}>}
 */
export async function obtenerConductoresActivos(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  if (params.search) qs.set("search", params.search);
  if (params.orden) qs.set("orden", params.orden);

  const qString = qs.toString();
  const url = qString ? `/api/conductores?${qString}` : "/api/conductores";

  const res = await apiFetch(url);

  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener conductores" };
  }

  const payload = res.data;
  const data = Array.isArray(payload) ? payload : payload?.data ?? [];
  const meta = payload?.meta;

  return meta ? { data, meta } : { data };
}

/**
 * Obtiene los camiones disponibles.
 *
 * NOTA: el backend actual no expone aún `/api/camiones`. Mientras se agrega,
 * devolvemos un arreglo vacío sin error para que la UI compile y funcione.
 * Cuando exista el endpoint, basta con cambiar la ruta aquí.
 *
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerCamionesDisponibles() {
  const res = await apiFetch(`/api/camiones`);

  if (!res.ok) {
    if (res.status === 404 || res.status === 0) {
      return { data: [] };
    }
    return { data: [], error: res.error || "Error al obtener camiones" };
  }

  const payload = res.data;
  const data = Array.isArray(payload) ? payload : payload?.data ?? [];
  return { data };
}

/**
 * Obtiene el detalle de una ruta.
 * @param {string} rutaId - ID de la ruta
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function obtenerRutaDetalle(rutaId) {
  if (!rutaId) {
    return { data: null, error: "rutaId es requerido" };
  }

  const res = await apiFetch(`/api/rutas/${rutaId}`);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener ruta" };
  }

  return { data: res.data?.data ?? res.data };
}

/**
 * Obtiene las anomalías reportadas de una ruta.
 * @param {string} rutaId
 */
export async function obtenerAnomaliasRuta(rutaId) {
  if (!rutaId) {
    return { data: [], error: "rutaId es requerido" };
  }

  const res = await apiFetch(`/api/rutas/${rutaId}/anomalias`);

  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener anomalías" };
  }

  const payload = res.data;
  return { data: Array.isArray(payload) ? payload : payload?.data ?? [], error: null };
}

/**
 * Cambia el estado de una ruta (incluye desasignar marcando estado).
 * @param {string} rutaId
 * @param {string} estado
 */
export async function actualizarEstadoRuta(rutaId, estado) {
  if (!rutaId || !estado) {
    return { success: false, error: "rutaId y estado son requeridos" };
  }

  const res = await apiFetch(`/api/rutas/${rutaId}/status`, {
    method: "PATCH",
    json: { estado },
  });

  if (!res.ok) {
    return { success: false, error: res.error || "Error al actualizar ruta" };
  }

  return { success: true, data: res.data?.data ?? res.data };
}

/**
 * HU-24: distancia vial (Google Routes en backend) y fechas estimadas.
 * @param {{ origen?: string, destino?: string, distancia_km?: number|string, fecha_inicio?: string, fecha_referencia?: string }} payload
 */
export async function estimarFechasEstimadas(payload) {
  const res = await apiFetch("/api/rutas/estimar-fechas", {
    method: "POST",
    json: payload || {},
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "No se pudo calcular la estimación",
    };
  }

  const data = res.data?.data ?? res.data ?? {};
  return { success: true, data };
}

/**
 * HU-9: guarda rango y día estimado de entrega (PATCH /api/rutas/:id/fechas-estimadas).
 * @param {string} rutaId
 * @param {{ fecha_estimada_inicio: string, fecha_estimada_fin: string, fecha_estimada_entrega: string, distancia_km?: number|string }} fechas — YYYY-MM-DD
 */
export async function actualizarFechasEstimadas(rutaId, fechas) {
  if (!rutaId) {
    return { success: false, error: "rutaId es requerido" };
  }
  const { fecha_estimada_inicio, fecha_estimada_fin, fecha_estimada_entrega } =
    fechas || {};
  if (
    !fecha_estimada_inicio?.trim() ||
    !fecha_estimada_fin?.trim() ||
    !fecha_estimada_entrega?.trim()
  ) {
    return {
      success: false,
      error:
        "Debe indicar fecha_estimada_inicio, fecha_estimada_fin y fecha_estimada_entrega",
    };
  }

  const json = {
    fecha_estimada_inicio: fecha_estimada_inicio.trim(),
    fecha_estimada_fin: fecha_estimada_fin.trim(),
    fecha_estimada_entrega: fecha_estimada_entrega.trim(),
  };
  if (fechas.distancia_km != null && String(fechas.distancia_km).trim() !== "") {
    json.distancia_km = Number(fechas.distancia_km);
  }

  const res = await apiFetch(`/api/rutas/${rutaId}/fechas-estimadas`, {
    method: "PATCH",
    json,
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "No se pudieron guardar las fechas estimadas",
    };
  }

  return { success: true, data: res.data?.data ?? res.data };
}

/**
 * HU-9: envía notificación de fecha estimada al correo del cliente.
 * @param {string} rutaId
 */
export async function notificarFechaEstimada(rutaId) {
  if (!rutaId) {
    return { success: false, error: "rutaId es requerido" };
  }

  const res = await apiFetch(`/api/rutas/${rutaId}/notificar-fecha-estimada`, {
    method: "POST",
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "No se pudo enviar la notificación",
    };
  }

  return { success: true, data: res.data };
}

/**
 * Obtiene el detalle de un conductor (GET /api/conductores/:id).
 * @param {string} conductorId
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function obtenerConductorDetalle(conductorId) {
  if (!conductorId) {
    return { data: null, error: "conductorId es requerido" };
  }

  const res = await apiFetch(`/api/conductores/${conductorId}`);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener conductor" };
  }

  return { data: res.data?.data ?? res.data };
}

/**
 * Obtiene rutas asignadas a un conductor.
 * Usa filtro server-side por UUID y fallback por relación anidada o RUT.
 * @param {string} conductorId
 * @param {string} [conductorRut]
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerRutasPorConductor(conductorId, conductorRut) {
  if (!conductorId && !conductorRut) {
    return { data: [], error: "conductorId es requerido" };
  }

  const conductorRef = { id: conductorId, rut: conductorRut };
  const rutasPorId = new Map();

  const agregarRutas = (lista) => {
    (lista || []).forEach((ruta) => {
      if (ruta?.id && rutaAsignadaAConductor(ruta, conductorRef)) {
        rutasPorId.set(ruta.id, ruta);
      }
    });
  };

  const resTodas = await apiFetch("/api/rutas");
  if (resTodas.ok) {
    agregarRutas(parseRutasPayload(resTodas.data));
  }

  if (conductorId) {
    const resFiltrado = await apiFetch(
      `/api/rutas?conductorId=${encodeURIComponent(conductorId)}`,
    );
    if (resFiltrado.ok) {
      agregarRutas(parseRutasPayload(resFiltrado.data));
    }
  }

  if (!resTodas.ok && rutasPorId.size === 0) {
    return {
      data: [],
      error: resTodas.error || "Error al obtener rutas del conductor",
    };
  }

  return { data: Array.from(rutasPorId.values()) };
}

/**
 * Obtiene el estado de la licencia de un conductor (días para vencer, etc.).
 * Mantiene el contrato de la versión anterior para no romper la UI.
 * @param {string} conductorId
 * @returns {Promise<{data: object|null, error?: string}>}
 */
export async function obtenerEstadoLicencia(conductorId) {
  if (!conductorId) {
    return { data: null, error: "conductorId es requerido" };
  }

  const res = await apiFetch(`/api/conductores/${conductorId}/license-status`);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener licencia" };
  }

  const status = res.data || {};

  if (!status.expiryDate) {
    return { data: null, error: status.message || "Licencia no registrada" };
  }

  const fechaVencimiento = new Date(status.expiryDate);
  const hoy = new Date();
  fechaVencimiento.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);

  const diasRestantes =
    typeof status.daysUntilExpiry === "number"
      ? status.daysUntilExpiry
      : Math.ceil(
          (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
        );

  return {
    data: {
      licenciaNumero: status.licenseNumber || null,
      vencimiento: status.expiryDate,
      diasRestantes,
      vencida: status.status === "EXPIRED" || diasRestantes < 0,
      proximaAVencer:
        status.status === "EXPIRING_SOON" ||
        (diasRestantes > 0 && diasRestantes <= 30),
    },
  };
}

/**
 * HU-37: métricas operacionales y pago de un conductor por período.
 * @param {string} conductorId
 * @param {{ periodo?: string, fechaInicio?: string, fechaFin?: string }} [filtros]
 */
export async function obtenerMetricasPagoConductor(conductorId, filtros = {}) {
  if (!conductorId) {
    return { data: null, error: "conductorId es requerido" };
  }

  const params = new URLSearchParams();
  if (filtros.periodo) params.set("periodo", filtros.periodo);
  if (filtros.fechaInicio) params.set("fechaInicio", filtros.fechaInicio);
  if (filtros.fechaFin) params.set("fechaFin", filtros.fechaFin);

  const qs = params.toString();
  const path = qs
    ? `/api/conductores/${conductorId}/metricas-pago?${qs}`
    : `/api/conductores/${conductorId}/metricas-pago`;

  const res = await apiFetch(path);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener métricas de pago" };
  }

  return { data: res.data?.data ?? res.data };
}

/**
 * HU-37 CA-08: comparativa de rendimiento entre conductores activos.
 * @param {{ periodo?: string, fechaInicio?: string, fechaFin?: string }} [filtros]
 */
export async function obtenerComparativaMetricasPago(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.periodo) params.set("periodo", filtros.periodo);
  if (filtros.fechaInicio) params.set("fechaInicio", filtros.fechaInicio);
  if (filtros.fechaFin) params.set("fechaFin", filtros.fechaFin);

  const qs = params.toString();
  const path = qs
    ? `/api/conductores/metricas-pago/comparativa?${qs}`
    : "/api/conductores/metricas-pago/comparativa";

  const res = await apiFetch(path);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener comparativa" };
  }

  return { data: res.data?.data ?? res.data };
}

/**
 * Crea un nuevo chofer (usuario Auth + perfil conductor).
 */
export async function crearConductor(data) {
  const res = await apiFetch(`/api/conductores`, {
    method: "POST",
    json: data,
  });
  if (!res.ok) {
    return { data: null, error: res.error || "Error al crear conductor" };
  }
  return { data: res.data };
}

/**
 * Crea un nuevo camión.
 */
export async function crearCamion(data) {
  const res = await apiFetch(`/api/camiones`, {
    method: "POST",
    json: data,
  });
  if (!res.ok) {
    return { data: null, error: res.error || "Error al crear camión" };
  }
  return { data: res.data };
}

/**
 * HU-59: estado de consolidación de una ruta maestra.
 * @param {string} rutaId
 */
export async function obtenerConsolidacion(rutaId) {
  if (!rutaId) {
    return { data: null, error: "rutaId es requerido" };
  }

  const res = await apiFetch(`/api/rutas/${rutaId}/consolidacion`);

  if (!res.ok) {
    return { data: null, error: res.error || "Error al obtener consolidación" };
  }

  return { data: res.data?.data ?? res.data, error: null };
}

/**
 * HU-59: consolida un pedido bajo una ruta maestra.
 * @param {string} rutaMaestraId
 * @param {string} pedidoId
 * @param {{ ignorar_advertencias_ocupacion?: boolean, ignorar_advertencias_distancia?: boolean }} [opciones]
 */
export async function consolidarPedidoEnRuta(rutaMaestraId, pedidoId, opciones = {}) {
  if (!rutaMaestraId || !pedidoId) {
    return { success: false, error: "rutaId y pedidoId son requeridos" };
  }

  const res = await apiFetch(`/api/rutas/${rutaMaestraId}/consolidar`, {
    method: "POST",
    json: {
      pedido_id: pedidoId,
      ignorar_advertencias_ocupacion: opciones.ignorar_advertencias_ocupacion === true,
      ignorar_advertencias_distancia: opciones.ignorar_advertencias_distancia === true,
    },
  });

  if (!res.ok) {
    const payload = res.data || {};
    const advertencias = payload.advertencias || payload.message?.advertencias;
    const requiere =
      payload.requiere_confirmacion === true ||
      payload.message?.requiere_confirmacion === true;

    return {
      success: false,
      error:
        (typeof payload.message === "string" ? payload.message : null) ||
        payload.message?.message ||
        res.error ||
        "No se pudo consolidar el pedido",
      advertencias: Array.isArray(advertencias) ? advertencias : [],
      requiere_confirmacion: requiere,
    };
  }

  return { success: true, data: res.data?.data ?? res.data };
}
