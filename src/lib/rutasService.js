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
 * @param {string} camionId - ID del camión
 * @param {number} cargaRequeridaKg - Carga requerida para validar la capacidad del camión
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function asignarConductorARuta(rutaId, conductorId, camionId, cargaRequeridaKg = 0) {
  if (!rutaId || !conductorId || !camionId) {
    return {
      success: false,
      error: "Ruta, conductor y camión son requeridos",
    };
  }

  try {
    // PASO 1: Validar licencia del conductor
    const validacion = await validarLicenciaConductor(conductorId);

    if (!validacion.isValid) {
      return {
        success: false,
        error: validacion.errorMessage,
      };
    }

    // PASO 2: Validar capacidad del camión (CA-3)
    // Se obtiene la capacidad desde la DB asumiendo un campo "capacidad_kg" o "tonelaje", y asegurando que esté disponible
    const { data: camion, error: camionError } = await supabase
      .from("camiones")
      // Seleccionamos "patente" y asumiendo "capacidad_kg" para validar. Puedes ajustar este campo al real de tu DB.
      .select("id, patente, capacidad_kg") 
      .eq("id", camionId)
      .single();

    if (camionError || !camion) {
      return {
        success: false,
        error: "No se pudo validar el camión seleccionado.",
      };
    }

    // Validar si el camión tiene la capacidad requerida (solo si hay carga requerida en la ruta y capacidad en el camión)
    if (cargaRequeridaKg > 0 && camion.capacidad_kg && camion.capacidad_kg < cargaRequeridaKg) {
      return {
        success: false,
        error: `Asignación denegada: La capacidad del camión (${camion.capacidad_kg}kg) es menor a la carga requerida (${cargaRequeridaKg}kg).`
      };
    }

    // PASO 3: Actualizar la ruta con el conductor y camión asignados (CA-2)
    const { data: rutaActualizada, error: updateError } = await supabase
      .from("rutas")
      .update({
        conductor_id: conductorId,
        camion_id: camionId,
        fecha_inicio: new Date().toISOString(),
      })
      .eq("id", rutaId)
      .select("id, conductor_id, camion_id, origen, destino, fecha_inicio")
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Error al asignar ruta: ${updateError.message}`,
      };
    }

    if (!rutaActualizada) {
      return {
        success: false,
        error: "No se encontró la ruta para asignar",
      };
    }

    return {
      success: true,
      data: {
        rutaId: rutaActualizada.id,
        conductorId,
        camionId,
        origen: rutaActualizada.origen,
        destino: rutaActualizada.destino,
        asignadoEn: rutaActualizada.fecha_inicio,
      },
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
        carga_requerida_kg,
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
 * Obtiene todos los camiones disponibles y con documentación al día
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function obtenerCamionesDisponibles() {
  try {
    const { data, error } = await supabase
      .from("camiones")
      // Asume patentes, estado y capacidad.
      .select("id, patente, capacidad_kg, estado")
      .eq("estado", "DISPONIBLE");
      // .eq("documentacion_al_dia", true); // Descomentar si tienes el flag en DB

    if (error) {
      return {
        data: [],
        error: `Error obtener camiones: ${error.message}`,
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
