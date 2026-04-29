// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook principal: fetches alerts from backend API and normalizes data
// to the format expected by the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/apiClient";

// ── Mapeo de valores de tipo/estado/prioridad ───────────────────────────────
const TIPO_MAP = {
  EMERGENCIA:   "BOTON_PANICO",
  DESVIO:       "DESVIO_RUTA",
  DESVIO_RUTA:  "DESVIO_RUTA",
  ANOMALIA:     "ANOMALIA",
  MANTENCION:   "MANTENCION",
};

/** BD Supabase (`estado_incidencia`) usa etiquetas en minúsculas; la UI sigue usando tokens EN_* */
const ESTADO_MAP = {
  // Enum Postgres actual: pendiente | en curso | resuelto
  pendiente: "PENDIENTE",
  "en curso": "EN_GESTION",
  resuelto: "RESUELTA",
  // Compatibilidad si algún entorno envía mayúsculas antiguas
  PENDIENTE: "PENDIENTE",
  EN_GESTION: "EN_GESTION",
  ATENDIDO: "EN_GESTION",
  RESUELTO: "RESUELTA",
  RESUELTA: "RESUELTA",
};

const PRIORIDAD_MAP = {
  CRITICA:  "CRITICA",
  ALTA:     "ALTA",
  MEDIA:    "NORMAL",
  NORMAL:   "NORMAL",
  BAJA:     "BAJA",
};

// ── Normaliza una fila de `incidencias` al formato de la UI ─────────────────
function mapIncidencia(row) {
  const conductor = row.conductores ?? {};
  const driverName = conductor.usuarios?.nombre || "—";

  // Patente: puede estar en camiones (via rutas) o en el row directamente
  const vehiclePlate =
    row.camiones?.patente ??
    row.rutas?.camiones?.patente ??
    row.patente ??
    row.vehiculo_patente ??
    "—";

  return {
    // Identificadores
    id:                row.identificación ?? row.id,
    _original_id:      row.identificación ?? row.id,

    // Tipo y prioridad
    alert_type:        TIPO_MAP[row.tipo]   ?? row.tipo   ?? "ANOMALIA",
    priority:          PRIORIDAD_MAP[row.prioridad] ?? "ALTA",
    status:            ESTADO_MAP[row.estado]        ?? "PENDIENTE",

    // Datos del conductor y vehículo (CA-2)
    driver_name:       driverName,
    vehicle_plate:     vehiclePlate,
    description:       row.descripción ?? row.descripcion ?? "",

    // Ubicación (para enlace Google Maps)
    lat:               row.latitud  ?? row.lat  ?? null,
    lng:               row.longitud ?? row.lng  ?? null,
    last_location_label: row.ultima_ubicacion ?? row.ubicacion ?? null,

    // Acuse de recibo (CA-3)
    acknowledged_by:   row.atendido_por   ?? row.acknowledged_by  ?? null,
    acknowledged_at:   row.fecha_atencion ?? row.acknowledged_at  ?? null,

    // Resolución
    resolved_at:       row.fecha_resolucion ?? row.resolved_at ?? null,

    // Timestamps
    created_at:        row.fecha_creacion ?? row.created_at ?? new Date().toISOString(),
  };
}

// ── Orden de prioridad ──────────────────────────────────────────────────────
const PRIORITY_ORDER = { CRITICA: 0, ALTA: 1, NORMAL: 2, BAJA: 3 };

function friendlyApiFailure(result, fallback) {
  const raw =
    result?.data?.message ??
    result?.data?.error ??
    result?.error ??
    "";
  const text = Array.isArray(raw) ? raw.join(" ") : String(raw || "");
  const trimmed = text.trim();
  if (trimmed && trimmed.length < 280) return trimmed;
  return fallback;
}

function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      try {
        const result = await apiFetch("/api/incidencias");
        if (!result.ok) {
          throw new Error(result.error || `HTTP ${result.status}`);
        }
        const data = result.data;
        const alerts_array = Array.isArray(data) ? data : data?.data || [];
        setAlerts(sortAlerts(alerts_array.map(mapIncidencia)));
      } catch (error) {
        console.error("Error al cargar incidencias:", error?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  // ── Polling para simular Realtime (fallback si no hay WebSocket) ───────────
  useEffect(() => {
    let interval;
    let cancelled = false;

    interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const result = await apiFetch("/api/incidencias");
        if (!result.ok) return;
        const data = result.data;
        const alerts_array = Array.isArray(data) ? data : data?.data || [];
        setAlerts(sortAlerts(alerts_array.map(mapIncidencia)));
      } catch (error) {
        console.warn("Polling error:", error?.message);
      }
    }, 5000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // ── Acuse de Recibo (CA-3) ─────────────────────────────────────────────────
  const acknowledgeAlert = useCallback(async (alertId, operatorId) => {
    try {
      const result = await apiFetch(
        `/api/incidencias/${alertId}/acknowledge`,
        {
          method: "PATCH",
          json: { operatorId },
        }
      );

      if (!result.ok) {
        const msg = friendlyApiFailure(
          result,
          result.status >= 500
            ? "El servidor no pudo registrar el acuse. La alerta sigue visible; intenta de nuevo en un momento."
            : "No se pudo registrar el acuse."
        );
        console.warn("acuse incidencia:", result.status, msg);
        return { ok: false, message: msg };
      }

      return { ok: true };
    } catch (error) {
      const msg =
        error?.message ||
        "No se pudo registrar el acuse. Comprueba tu conexión e intenta de nuevo.";
      console.error("Error al hacer acuse de recibo:", msg);
      return { ok: false, message: msg };
    }
  }, []);

  // ── Resolver incidencia ───────────────────────────────────────────────────
  const resolveAlert = useCallback(async (alertId) => {
    try {
      const result = await apiFetch(`/api/incidencias/${alertId}/resolve`, {
        method: "PATCH",
      });

      if (!result.ok) {
        const msg = friendlyApiFailure(
          result,
          result.status >= 500
            ? "No pudimos marcar la incidencia como resuelta. Intenta de nuevo en un momento."
            : "No se pudo resolver la incidencia."
        );
        console.warn("resolver incidencia:", result.status, msg);
        return { ok: false, message: msg };
      }

      return { ok: true };
    } catch (error) {
      const msg =
        error?.message ||
        "No se pudo resolver la incidencia. Comprueba tu conexión.";
      console.error("Error al resolver incidencia:", msg);
      return { ok: false, message: msg };
    }
  }, []);

  return { alerts, loading, acknowledgeAlert, resolveAlert };
}
