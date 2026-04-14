// src/routes/alertRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Rutas API para gestionar alertas
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import {
  getUnreadAlerts,
  getAllAlerts,
  markAlertAsRead,
  markAlertsAsRead,
  deleteAlert,
  getAlertStats,
} from "../services/alertService.js";
import { runMonitoringJobManual } from "../cron/monitoringCron.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/alerts/unread
 * Obtiene todas las alertas no leídas
 */
router.get("/unread", async (req, res) => {
  try {
    const alerts = await getUnreadAlerts();
    res.status(200).json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error("Error en GET /unread:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts
 * Obtiene todas las alertas
 * Query: ?limit=50 (por defecto)
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await getAllAlerts(limit);
    res.status(200).json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error("Error en GET /:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts/stats
 * Obtiene estadísticas de alertas
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await getAlertStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error en GET /stats:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/alerts/:id/read
 * Marca una alerta como leída
 */
router.put("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await markAlertAsRead(id);
    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error("Error en PUT /:id/read:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/alerts/read-multiple
 * Marca múltiples alertas como leídas
 * Body: { alertIds: [1, 2, 3] }
 */
router.put("/read-multiple", async (req, res) => {
  try {
    const { alertIds } = req.body;
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "alertIds debe ser un array no vacío",
      });
    }
    const alerts = await markAlertsAsRead(alertIds);
    res.status(200).json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error("Error en PUT /read-multiple:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/alerts/:id
 * Elimina una alerta
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteAlert(id);
    res.status(200).json({
      success: true,
      message: `Alerta ${id} eliminada`,
    });
  } catch (error) {
    logger.error("Error en DELETE /:id:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/alerts/run-job
 * Ejecuta manualmente el job de monitoreo (solo en desarrollo)
 */
router.post("/run-job", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Esta operación no está permitida en producción",
      });
    }

    await runMonitoringJobManual();
    res.status(200).json({
      success: true,
      message: "Job de monitoreo ejecutado manualmente",
    });
  } catch (error) {
    logger.error("Error en POST /run-job:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
