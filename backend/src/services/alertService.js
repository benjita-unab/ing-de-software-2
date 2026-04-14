// src/services/alertService.js
// ─────────────────────────────────────────────────────────────────────────────
// Servicio para gestionar alertas del sistema
// ─────────────────────────────────────────────────────────────────────────────

import supabase from "../lib/supabaseClient.js";
import { logger } from "../utils/logger.js";

/**
 * Obtiene todas las alertas no leídas
 */
export async function getUnreadAlerts() {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .select(
        `
        id,
        tipo,
        prioridad,
        descripcion,
        estado,
        entidad_id,
        entidad_tipo,
        fecha_creacion,
        fecha_lectura
      `
      )
      .eq("estado", "No leída")
      .order("fecha_creacion", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error("Error al obtener alertas no leídas:", error.message);
    throw error;
  }
}

/**
 * Obtiene todas las alertas (leídas y no leídas)
 */
export async function getAllAlerts(limit = 50) {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .select("*")
      .order("fecha_creacion", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error("Error al obtener todas las alertas:", error.message);
    throw error;
  }
}

/**
 * Marca una alerta como leída
 */
export async function markAlertAsRead(alertId) {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .update({
        estado: "Leída",
        fecha_lectura: new Date().toISOString(),
      })
      .eq("id", alertId)
      .select();

    if (error) throw error;

    logger.success(`Alerta ${alertId} marcada como leída`);
    return data?.[0];
  } catch (error) {
    logger.error("Error al marcar alerta como leída:", error.message);
    throw error;
  }
}

/**
 * Marca múltiples alertas como leídas
 */
export async function markAlertsAsRead(alertIds) {
  try {
    const { data, error } = await supabase
      .from("alertas_sistema")
      .update({
        estado: "Leída",
        fecha_lectura: new Date().toISOString(),
      })
      .in("id", alertIds)
      .select();

    if (error) throw error;

    logger.success(`${alertIds.length} alertas marcadas como leídas`);
    return data || [];
  } catch (error) {
    logger.error("Error al marcar alertas como leídas:", error.message);
    throw error;
  }
}

/**
 * Elimina una alerta
 */
export async function deleteAlert(alertId) {
  try {
    const { error } = await supabase
      .from("alertas_sistema")
      .delete()
      .eq("id", alertId);

    if (error) throw error;

    logger.success(`Alerta ${alertId} eliminada`);
  } catch (error) {
    logger.error("Error al eliminar alerta:", error.message);
    throw error;
  }
}

/**
 * Obtiene estadísticas de alertas
 */
export async function getAlertStats() {
  try {
    const { data: unread, error: errorUnread } = await supabase
      .from("alertas_sistema")
      .select("id", { count: "exact" })
      .eq("estado", "No leída");

    const { data: byPriority, error: errorPriority } = await supabase
      .from("alertas_sistema")
      .select("prioridad, id", { count: "exact" });

    if (errorUnread || errorPriority) throw new Error("Error fetching stats");

    const stats = {
      unreadCount: unread?.length || 0,
      totalCount: byPriority?.length || 0,
      byPriority: {
        Alta: byPriority?.filter((a) => a.prioridad === "Alta").length || 0,
        Crítica:
          byPriority?.filter((a) => a.prioridad === "Crítica").length || 0,
        Normal:
          byPriority?.filter((a) => a.prioridad === "Normal").length || 0,
        Baja: byPriority?.filter((a) => a.prioridad === "Baja").length || 0,
      },
    };

    return stats;
  } catch (error) {
    logger.error("Error al obtener estadísticas:", error.message);
    throw error;
  }
}

export default {
  getUnreadAlerts,
  getAllAlerts,
  markAlertAsRead,
  markAlertsAsRead,
  deleteAlert,
  getAlertStats,
};
