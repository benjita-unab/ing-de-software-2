// backend/src/server.js
// ─────────────────────────────────────────────────────────────────────────────
// Servidor Express principal para LogiTrack Backend
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ IMPORTANTE: Cargar dotenv ANTES de cualquier otro import
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../", ".env") });

import express from "express";
import cors from "cors";
import { startLicenseAlertsCron, checkLicensesAndCreateAlerts } from "./services/licenseAlertService.js";

// ── Configuración ────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const CRON_TIME = process.env.CRON_TIME || "0 0 * * *"; // Medianoche diaria por defecto

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rutas de Health Check ────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "LogiTrack Backend",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "🚀 LogiTrack Backend API",
    version: "1.0.0",
    docs: "/api/docs",
    health: "/health",
  });
});

// ── Rutas de Alertas de Licencias (HU-5) ─────────────────────────────────────

/**
 * GET /api/license-alerts/status
 * Obtiene el estado actual del sistema de alertas
 */
app.get("/api/license-alerts/status", (req, res) => {
  res.status(200).json({
    status: "running",
    message: "Sistema de alertas de licencias activo",
    cronExpression: CRON_TIME,
    description: "Verifica licencias que vencen en 30 días",
    lastCheck: new Date().toISOString(),
  });
});

/**
 * POST /api/license-alerts/check-now
 * Ejecuta manualmente la verificación de licencias (para testing/debugging)
 * ⚠️ Endpoint administrativo - proteger en producción
 */
app.post("/api/license-alerts/check-now", async (req, res) => {
  try {
    console.log("🔍 Verificación manual de licencias solicitada...");
    const result = await checkLicensesAndCreateAlerts();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Verificación completada",
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("❌ Error en endpoint /api/license-alerts/check-now:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ── Error Handling ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
  });
});

// ── Iniciar Servidor ─────────────────────────────────────────────────────────
async function startServer() {
  try {
    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log("\n");
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`✅ SUCCESS: 🚀 Servidor corriendo en puerto ${PORT}`);
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`📍 Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`📋 Docs: http://localhost:${PORT}/api/license-alerts/status`);
      console.log("");
    });

    // Iniciar Cron Job
    console.log("═══════════════════════════════════════════════════════════");
    console.log("⏰ Iniciando Cron Job de Alertas de Licencias...");
    console.log("═══════════════════════════════════════════════════════════");
    startLicenseAlertsCron(CRON_TIME);
    console.log("");

    // Ejecutar verificación inicial (opcional - para ver resultados inmediatos)
    console.log("🔍 Ejecutando verificación inicial de licencias...");
    await checkLicensesAndCreateAlerts();

    console.log("\n✅ SUCCESS: ⏰ Sistema de alertas completamente inicializado\n");
  } catch (error) {
    console.error("❌ ERROR al iniciar servidor:", error);
    process.exit(1);
  }
}

// ── Manejo de Señales ────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM recibido. Cerrando servidor...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n⚠️  SIGINT recibido. Cerrando servidor...");
  process.exit(0);
});

// ── Ejecutar ─────────────────────────────────────────────────────────────────
startServer();
