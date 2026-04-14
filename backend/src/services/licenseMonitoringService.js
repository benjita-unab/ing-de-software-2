// src/services/licenseMonitoringService.js
// ─────────────────────────────────────────────────────────────────────────────
// Servicio de monitoreo de licencias y revisiones técnicas
// ─────────────────────────────────────────────────────────────────────────────

import supabase from "../lib/supabaseClient.js";
import { logger } from "../utils/logger.js";
import { getDatePlusDays } from "../utils/dateHelpers.js";

const ALERT_PRIORITY = "Alta";
const ALERT_STATUS = "No leída";
const DAYS_ALERT = 30;

/**
 * Busca licencias de conducir que vencen exactamente en 30 días
 */
async function getLicensesExpiringIn30Days() {
  try {
    logger.info("Buscando licencias que vencen en 30 días...");

    const expirationDate = getDatePlusDays(DAYS_ALERT);

    const { data, error } = await supabase
      .from("licencias_conducir")
      .select(
        `
        id,
        conductor_id,
        numero_licencia,
        fecha_vencimiento,
        conductores:conductor_id (
          id,
          usuarios:usuario_id (
            id,
            nombre,
            email
          )
        )
      `
      )
      .eq("fecha_vencimiento", expirationDate)
      .eq("estado", "vigente");

    if (error) throw error;

    logger.info(`Licencias encontradas: ${data?.length || 0}`);
    return data || [];
  } catch (error) {
    logger.error("Error al buscar licencias:", error.message);
    throw error;
  }
}

/**
 * Busca revisiones técnicas que vencen exactamente en 30 días
 */
async function getMaintenanceExpiringIn30Days() {
  try {
    logger.info("Buscando revisiones técnicas que vencen en 30 días...");

    const expirationDate = getDatePlusDays(DAYS_ALERT);

    const { data, error } = await supabase
      .from("revisiones_tecnicas")
      .select(
        `
        id,
        camion_id,
        fecha_vencimiento,
        numero_revision,
        camiones:camion_id (
          id,
          patente,
          marca_modelo
        )
      `
      )
      .eq("fecha_vencimiento", expirationDate)
      .eq("estado", "vigente");

    if (error) throw error;

    logger.info(`Revisiones técnicas encontradas: ${data?.length || 0}`);
    return data || [];
  } catch (error) {
    logger.error("Error al buscar revisiones técnicas:", error.message);
    throw error;
  }
}

/**
 * Crea una alerta en la tabla alertas_sistema
 */
async function createAlert(alertData) {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .insert([alertData])
      .select();

    if (error) throw error;

    logger.success("Alerta creada:", alertData.descripcion);
    return data?.[0];
  } catch (error) {
    logger.error("Error al crear alerta:", error.message);
    throw error;
  }
}

/**
 * Verifica si ya existe una alerta similar sin leer
 */
async function alertExists(tipo, entidad_id, entidad_tipo) {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .select("id")
      .eq("tipo", tipo)
      .eq("entidad_id", entidad_id)
      .eq("entidad_tipo", entidad_tipo)
      .eq("estado", "No leída")
      .single();

    // Si error es PGRST116, significa que no hay registros (es ok)
    if (error?.code === "PGRST116") return false;
    if (error && error.code !== "PGRST116") throw error;

    return !!data;
  } catch (error) {
    logger.warn("Error al verificar alerta existente:", error.message);
    return false;
  }
}

/**
 * Procesa licencias vencidas y crea alertas
 */
async function processLicenseAlerts() {
  try {
    logger.info("=== INICIANDO PROCESAMIENTO DE LICENCIAS ===");

    const licenses = await getLicensesExpiringIn30Days();

    for (const license of licenses) {
      const conductor = license.conductores;
      const usuario = conductor?.usuarios;
      const nombreConductor = usuario?.nombre || "Desconocido";

      // Verificar si la alerta ya existe
      const exists = await alertExists(
        "vencimiento_licencia",
        license.conductor_id,
        "conductor"
      );

      if (exists) {
        logger.warn(
          `Alerta ya existe para conductor ${nombreConductor}. Omitiendo...`
        );
        continue;
      }

      // Crear la alerta
      const alertData = {
        tipo: "vencimiento_licencia",
        prioridad: ALERT_PRIORITY,
        descripcion: `⚠️ Atención: La licencia del chofer ${nombreConductor} vence el ${license.fecha_vencimiento}`,
        entidad_id: license.conductor_id,
        entidad_tipo: "conductor",
        relacionado_id: license.id,
        estado: ALERT_STATUS,
        fecha_creacion: new Date().toISOString(),
      };

      await createAlert(alertData);
    }

    logger.success(
      `Procesamiento de licencias completado. Total: ${licenses.length}`
    );
  } catch (error) {
    logger.error("Error en processLicenseAlerts:", error.message);
  }
}

/**
 * Procesa revisiones técnicas vencidas y crea alertas
 */
async function processMaintenanceAlerts() {
  try {
    logger.info("=== INICIANDO PROCESAMIENTO DE REVISIONES TÉCNICAS ===");

    const maintenances = await getMaintenanceExpiringIn30Days();

    for (const maintenance of maintenances) {
      const camion = maintenance.camiones;
      const patente = camion?.patente || "Desconocida";

      // Verificar si la alerta ya existe
      const exists = await alertExists(
        "vencimiento_revision_tecnica",
        maintenance.camion_id,
        "camion"
      );

      if (exists) {
        logger.warn(
          `Alerta ya existe para camión ${patente}. Omitiendo...`
        );
        continue;
      }

      // Crear la alerta
      const alertData = {
        tipo: "vencimiento_revision_tecnica",
        prioridad: ALERT_PRIORITY,
        descripcion: `⚠️ Atención: La revisión técnica del camión ${patente} vence el ${maintenance.fecha_vencimiento}`,
        entidad_id: maintenance.camion_id,
        entidad_tipo: "camion",
        relacionado_id: maintenance.id,
        estado: ALERT_STATUS,
        fecha_creacion: new Date().toISOString(),
      };

      await createAlert(alertData);
    }

    logger.success(
      `Procesamiento de revisiones técnicas completado. Total: ${maintenances.length}`
    );
  } catch (error) {
    logger.error("Error en processMaintenanceAlerts:", error.message);
  }
}

/**
 * Función principal que ejecuta todo el monitoreo
 */
export async function runMonitoringJob() {
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logger.info(`INICIANDO JOB DE MONITOREO - ${new Date().toLocaleString("es-CL")}`);
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    await processLicenseAlerts();
    await processMaintenanceAlerts();

    logger.success("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.success(`JOB COMPLETADO - ${new Date().toLocaleString("es-CL")}`);
    logger.success("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    logger.error("Error crítico en runMonitoringJob:", error);
  }
}

export default {
  runMonitoringJob,
  processLicenseAlerts,
  processMaintenanceAlerts,
  getLicensesExpiringIn30Days,
  getMaintenanceExpiringIn30Days,
};
