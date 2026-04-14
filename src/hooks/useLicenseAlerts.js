// src/hooks/useLicenseAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook personalizado para consumir alertas de vencimiento de licencias del backend
// Se suscribe a la API REST y actualiza en tiempo real
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const POLL_INTERVAL = 30000; // Actualizar cada 30 segundos

export function useLicenseAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  /**
   * Obtiene todas las alertas no leídas del backend
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts/unread`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { data } = await response.json();
      setAlerts(data || []);
      setError(null);
    } catch (err) {
      console.error("Error al obtener alertas de licencias:", err);
      setError(err.message);
      // No actualizar los alertas en caso de error, mantener los anteriores
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marca una alerta como leída
   */
  const markAsRead = useCallback(
    async (alertId) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/alerts/${alertId}/read`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Actualizar estado local
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      } catch (err) {
        console.error(`Error al marcar alerta ${alertId} como leída:`, err);
      }
    },
    []
  );

  /**
   * Marca múltiples alertas como leídas
   */
  const markMultipleAsRead = useCallback(async (alertIds) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts/read-multiple`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Actualizar estado local
      setAlerts((prev) => prev.filter((a) => !alertIds.includes(a.id)));
    } catch (err) {
      console.error("Error al marcar múltiples alertas:", err);
    }
  }, []);

  /**
   * Elimina una alerta
   */
  const deleteAlert = useCallback(async (alertId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts/${alertId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Actualizar estado local
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error(`Error al eliminar alerta ${alertId}:`, err);
    }
  }, []);

  /**
   * Obtiene estadísticas de alertas
   */
  const getStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts/stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error("Error al obtener estadísticas:", err);
      return null;
    }
  }, []);

  // ── Carga inicial y polling ────────────────────────────────────────────────
  useEffect(() => {
    // Carga inicial
    fetchAlerts();

    // Polling cada 30 segundos
    pollIntervalRef.current = setInterval(fetchAlerts, POLL_INTERVAL);

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    fetchAlerts, // Para actualizar manualmente
    markAsRead,
    markMultipleAsRead,
    deleteAlert,
    getStats,
  };
}

export default useLicenseAlerts;
