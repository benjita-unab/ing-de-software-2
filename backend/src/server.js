// src/server.js
// ─────────────────────────────────────────────────────────────────────────────
// Servidor Express principal - Backend API para Logitrack
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { startMonitoringCron } from "./cron/monitoringCron.js";
import alertRoutes from "./routes/alertRoutes.js";
import { logger } from "./utils/logger.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CRON_TIME = process.env.CRON_TIME || "0 0 * * *"; // 00:00 por defecto

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Info del servidor
 */
app.get("/api/info", (req, res) => {
  res.status(200).json({
    name: "Logitrack Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    cronTime: CRON_TIME,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Rutas de alertas
 */
app.use("/api/alerts", alertRoutes);

/**
 * Ruta 404
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.path,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN DEL SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    // Iniciar servidor Express
    app.listen(PORT, () => {
      logger.success(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📍 Ambiente: ${process.env.NODE_ENV || "development"}`);
    });

    // Iniciar Cron Job de monitoreo
    logger.info(`⏰ Iniciando Cron Job con expresión: ${CRON_TIME}`);
    startMonitoringCron(CRON_TIME);

    logger.success("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.success("✅ Backend Logitrack iniciado correctamente");
    logger.success("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    logger.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;
