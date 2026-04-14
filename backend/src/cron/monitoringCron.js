// src/cron/monitoringCron.js
// ─────────────────────────────────────────────────────────────────────────────
// Task de Cron que se ejecuta diariamente para monitorear licencias
// ─────────────────────────────────────────────────────────────────────────────

import cron from "node-cron";
import { runMonitoringJob } from "../services/licenseMonitoringService.js";
import { logger } from "../utils/logger.js";

let cronTask = null;

/**
 * Inicia el cron job de monitoreo
 * @param {string} cronExpression - Expresión cron (ej: "0 0 * * *" = 00:00 todos los días)
 */
export function startMonitoringCron(cronExpression = "0 0 * * *") {
  // Validar expresión cron
  if (!cron.validate(cronExpression)) {
    logger.error(
      `Expresión cron inválida: ${cronExpression}. Formato esperado: "0 0 * * *"`
    );
    throw new Error("Invalid cron expression");
  }

  // Si ya existe un cron activo, detenerlo
  if (cronTask) {
    stopMonitoringCron();
  }

  cronTask = cron.schedule(cronExpression, async () => {
    logger.info(`⏰ Ejecutando Cron Job de Monitoreo`);
    try {
      await runMonitoringJob();
    } catch (error) {
      logger.error("Error durante la ejecución del cron job:", error);
    }
  });

  logger.success(`✅ Cron job iniciado con expresión: ${cronExpression}`);
  return cronTask;
}

/**
 * Detiene el cron job
 */
export function stopMonitoringCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask.destroy();
    cronTask = null;
    logger.info("🛑 Cron job detenido");
  }
}

/**
 * Ejecuta manualmente el job de monitoreo (útil para testing)
 */
export async function runMonitoringJobManual() {
  logger.info("🔧 Ejecutando job de monitoreo manualmente...");
  try {
    await runMonitoringJob();
    logger.success("✅ Job completado manualmente");
  } catch (error) {
    logger.error("Error ejecutando job manualmente:", error);
    throw error;
  }
}

export default {
  startMonitoringCron,
  stopMonitoringCron,
  runMonitoringJobManual,
};
