// src/utils/logger.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de logging
// ─────────────────────────────────────────────────────────────────────────────

const LOG_LEVELS = {
  INFO: "ℹ️ INFO",
  SUCCESS: "✅ SUCCESS",
  WARN: "⚠️ WARN",
  ERROR: "❌ ERROR",
};

function formatTime() {
  return new Date().toLocaleString("es-CL");
}

export const logger = {
  info: (message, data = "") => {
    console.log(`[${formatTime()}] ${LOG_LEVELS.INFO}: ${message}`, data);
  },

  success: (message, data = "") => {
    console.log(`[${formatTime()}] ${LOG_LEVELS.SUCCESS}: ${message}`, data);
  },

  warn: (message, data = "") => {
    console.warn(`[${formatTime()}] ${LOG_LEVELS.WARN}: ${message}`, data);
  },

  error: (message, data = "") => {
    console.error(`[${formatTime()}] ${LOG_LEVELS.ERROR}: ${message}`, data);
  },
};

export default logger;
