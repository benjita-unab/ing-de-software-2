// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook principal: fetches alerts from backend API and normalizes data
// to the format expected by the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { getAuthToken, loginWeb } from "../lib/apiClient";

async function ensureToken() {
  let token = getAuthToken();
  if (!token) {
    try {
      token = await loginWeb();
    } catch (e) {
      console.error("Auto-login web falló:", e?.message || e);
      return null;
    }
  }
  return token;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// ── Mapeo de valores de tipo/estado/prioridad ───────────────────────────────
const TIPO_MAP = {
  EMERGENCIA:   "BOTON_PANICO",
  DESVIO:       "DESVIO_RUTA",
  DESVIO_RUTA:  "DESVIO_RUTA",
  ANOMALIA:     "ANOMALIA",
  MANTENCION:   "MANTENCION",
};

const ESTADO_MAP = {
  PENDIENTE:  "PENDIENTE",
  EN_GESTION: "EN_GESTION",
  ATENDIDO:   "EN_GESTION",
  RESUELTO:   "RESUELTA",
  RESUELTA:   "RESUELTA",
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

function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

// ── Query con JOIN a conductores (y camiones si existe la relación) ──────────
const SELECT_QUERY = `
  *,
  conductores (
    id,
    usuarios (
      nombre
    )
  ),
  rutas (
    id,
    camiones (
      id,
      patente
    )
  )
`.trim();

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const token = await ensureToken();
      if (!token) {
        console.warn("No authentication token found");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/incidencias`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch alerts: ${response.statusText}`);
        }

        const data = await response.json();
        const alerts_array = Array.isArray(data) ? data : data.data || [];
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

    (async () => {
      const initialToken = await ensureToken();
      if (!initialToken || cancelled) return;

      interval = setInterval(async () => {
        const token = getAuthToken();
        if (!token) return;
        try {
          const response = await fetch(`${API_BASE_URL}/api/incidencias`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) return;

          const data = await response.json();
          const alerts_array = Array.isArray(data) ? data : data.data || [];
          setAlerts(sortAlerts(alerts_array.map(mapIncidencia)));
        } catch (error) {
          console.warn("Polling error:", error?.message);
        }
      }, 5000);

      setPollingInterval(interval);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // ── Acuse de Recibo (CA-3) ─────────────────────────────────────────────────
  const acknowledgeAlert = useCallback(async (alertId, operatorId) => {
    const token = await ensureToken();
    if (!token) {
      console.warn("No authentication token found");
      return false;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/incidencias/${alertId}/acknowledge`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operatorId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error al hacer acuse de recibo:", error?.message);
      return false;
    }
  }, []);

  // ── Resolver incidencia ───────────────────────────────────────────────────
  const resolveAlert = useCallback(async (alertId) => {
    const token = await ensureToken();
    if (!token) {
      console.warn("No authentication token found");
      return false;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/incidencias/${alertId}/resolve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to resolve alert: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error al resolver incidencia:", error?.message);
      return false;
    }
  }, []);

  return { alerts, loading, acknowledgeAlert, resolveAlert };
}

// ── Alarma sonora ─────────────────────────────────────────────────────────
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
    console.warn("Audio no disponible:", e);
  }
}



