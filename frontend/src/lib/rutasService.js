// src/lib/rutasService.js
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para gestión de rutas y asignación de conductores con validación
// de licencias (HU-5 CA-3).
//
// Toda la lógica crítica pasa por el backend NestJS a través de `apiFetch`.
// No accedemos a Supabase directamente desde el frontend.
// ─────────────────────────────────────────────────────────────────────────────

import { apiFetch } from "./apiClient";

/**
 * Crea una ruta (POST /api/rutas).
 * @param {object} payload — cliente_id, origen, destino obligatorios; conductor_id, camion_id, fecha_inicio, eta opcionales (ISO string).
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function crearRuta(payload) {
  if (!payload?.cliente_id || !payload?.origen || !payload?.destino) {
    return {
      success: false,
      error: "cliente_id, origen y destino son obligatorios",
    };
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
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerConductoresActivos() {
  const res = await apiFetch(`/api/conductores`);

  if (!res.ok) {
    return { data: [], error: res.error || "Error al obtener conductores" };
  }

  const payload = res.data;
  const data = Array.isArray(payload) ? payload : payload?.data ?? [];
  return { data };
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
