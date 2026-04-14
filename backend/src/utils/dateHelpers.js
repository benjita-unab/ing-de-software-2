// src/utils/dateHelpers.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilidades para manejo de fechas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD
 */
export function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Obtiene la fecha de hace N días
 */
export function getDateMinusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Obtiene la fecha de aquí a N días
 */
export function getDatePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Calcula los días restantes entre dos fechas
 */
export function daysUntilDate(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(targetDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return targetDate >= today ? diffDays : -diffDays;
}

/**
 * Verifica si una fecha vence exactamente en N días
 */
export function expiresInExactlyDays(dateString, days) {
  return daysUntilDate(dateString) === days;
}
