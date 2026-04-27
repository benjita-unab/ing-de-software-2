// src/lib/rutasService.js
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para gestión de rutas y asignación de conductores con validación
// de licencias (HU-5 CA-3)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";

/**
 * Valida que un conductor tenga licencia vigente
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

  try {
    // Consultar datos del conductor
    const { data: conductor, error } = await supabase
      .from("conductores")
      .select("id, usuario_id, rut, licencia_numero, licencia_vencimiento, activo")
      .eq("id", conductorId)
      .single();

    if (error) {
      return {
        isValid: false,
        errorMessage: `Error al consultar conductor: ${error.message}`,
      };
    }

    if (!conductor) {
      return {
        isValid: false,
        errorMessage: "Conductor no encontrado",
      };
    }

    // Validar que el conductor esté activo
    if (!conductor.activo) {
      return {
        isValid: false,
        errorMessage: "El conductor no está activo en el sistema",
      };
    }

    // Validar que tenga licencia registrada
    if (!conductor.licencia_vencimiento) {
      return {
        isValid: false,
        errorMessage: "Asignación denegada: El conductor no tiene licencia registrada",
      };
    }

    // Comparar fecha de vencimiento con fecha actual
    const fechaVencimiento = new Date(conductor.licencia_vencimiento);
    const hoy = new Date();

    // Normalizar ambas fechas a medianoche para comparación correcta
    fechaVencimiento.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    // Si hoy > fecha_vencimiento, la licencia está vencida
    if (hoy > fechaVencimiento) {
      return {
        isValid: false,
        errorMessage: "Asignación denegada: La licencia del conductor se encuentra vencida",
      };
    }

    // Licencia válida
    return {
      isValid: true,
      conductor,
    };
  } catch (err) {
    return {
      isValid: false,
      errorMessage: `Error procesando validación: ${err.message}`,
    };
  }
}

/**
 * Asigna un conductor a una ruta después de validar su licencia
 * @param {string} rutaId - ID de la ruta
 * @param {string} conductorId - ID del conductor
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function asignarConductorARuta(rutaId, conductorId, camionId) {
  if (!rutaId || !conductorId) {
    return {
      success: false,
      error: "rutaId y conductorId son requeridos",
    };
  }

  const token = localStorage.getItem("logitrack_access_token");
  if (!token) {
    return {
      success: false,
      error: "Token de autorización no disponible",
    };
  }

  const payload = {
    rutaId,
    conductorId,
  };
  if (camionId) {
    payload.camionId = camionId;
  }

  try {
    const response = await fetch("/api/rutas/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error:
          payload?.message || payload?.error ||
          `Error al asignar ruta: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: payload?.data ?? payload,
    };
  } catch (err) {
    return {
      success: false,
      error: `Error inesperado: ${err.message}`,
    };
  }
}

/**
 * Obtiene todas las rutas sin asignar (sin conductor)
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerRutasSinAsignar() {
  try {
    const { data, error } = await supabase
      .from("rutas")
      .select(
        `
        id, 
        cliente_id, 
        origen, 
        destino, 
        estado, 
        eta, 
        created_at,
        clientes(id, nombre)
      `
      )
      .is("conductor_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        data: [],
        error: `Error obtener rutas: ${error.message}`,
      };
    }

    return { data };
  } catch (err) {
    return {
      data: [],
      error: `Error inesperado: ${err.message}`,
    };
  }
}

/**
 * Obtiene todos los conductores activos
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerConductoresActivos() {
  try {
    const { data, error } = await supabase
      .from("conductores")
      .select("id, rut, licencia_numero, licencia_vencimiento, activo")
      .eq("activo", true)
      .order("rut", { ascending: true });

    if (error) {
      return {
        data: [],
        error: `Error obtener conductores: ${error.message}`,
      };
    }

    return { data };
  } catch (err) {
    return {
      data: [],
      error: `Error inesperado: ${err.message}`,
    };
  }
}

/**
 * Obtiene información detallada de una ruta
 * @param {string} rutaId - ID de la ruta
 * @returns {Promise<{data: object, error?: string}>}
 */
export async function obtenerRutaDetalle(rutaId) {
  try {
    const { data, error } = await supabase
      .from("rutas")
      .select(
        `
        id,
        cliente_id,
        conductor_id,
        camion_id,
        origen,
        destino,
        estado,
        fecha_inicio,
        fecha_fin,
        eta,
        created_at,
        conductores(id, rut, licencia_numero, licencia_vencimiento),
        clientes(id, nombre),
        camiones(id, placa)
      `
      )
      .eq("id", rutaId)
      .single();

    if (error) {
      return {
        data: null,
        error: `Error obtener ruta: ${error.message}`,
      };
    }

    return { data };
  } catch (err) {
    return {
      data: null,
      error: `Error inesperado: ${err.message}`,
    };
  }
}

/**
 * Desasigna un conductor de una ruta
 * @param {string} rutaId - ID de la ruta
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function desasignarConductor(rutaId) {
  try {
    const { error } = await supabase
      .from("rutas")
      .update({
        conductor_id: null,
        fecha_inicio: null,
      })
      .eq("id", rutaId);

    if (error) {
      return {
        success: false,
        error: `Error al desasignar: ${error.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Error inesperado: ${err.message}`,
    };
  }
}

/**
 * Obtiene el estado de una licencia (días hasta vencer, si está vencida, etc.)
 * @param {string} conductorId - ID del conductor
 * @returns {Promise<{data: object, error?: string}>}
 */
export async function obtenerEstadoLicencia(conductorId) {
  try {
    const { data: conductor, error } = await supabase
      .from("conductores")
      .select("id, licencia_numero, licencia_vencimiento")
      .eq("id", conductorId)
      .single();

    if (error) {
      return {
        data: null,
        error: `Error obtener licencia: ${error.message}`,
      };
    }

    if (!conductor || !conductor.licencia_vencimiento) {
      return {
        data: null,
        error: "Licencia no registrada",
      };
    }

    const fechaVencimiento = new Date(conductor.licencia_vencimiento);
    const hoy = new Date();

    fechaVencimiento.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diasRestantes = Math.ceil(
      (fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      data: {
        licenciaNumero: conductor.licencia_numero,
        vencimiento: conductor.licencia_vencimiento,
        diasRestantes,
        vencida: diasRestantes < 0,
        proximaAVencer: diasRestantes > 0 && diasRestantes <= 30,
      },
    };
  } catch (err) {
    return {
      data: null,
      error: `Error inesperado: ${err.message}`,
    };
  }
}
