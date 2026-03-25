// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook principal: se suscribe a Supabase Realtime (tabla: incidencias)
// y normaliza los datos al formato que espera la UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const TABLE = "incidencias";

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

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE)
        .select(SELECT_QUERY)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar incidencias:", error.message);
      } else if (data) {
        setAlerts(sortAlerts(data.map(mapIncidencia)));
      }
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  // ── Supabase Realtime subscription (CA-4: ≤ 3 segundos) ──────────────────
  useEffect(() => {
    const channel = supabase
      .channel("incidencias-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === "INSERT") {
            // Fetch completo para incluir el JOIN de conductores
            const { data } = await supabase
              .from(TABLE)
              .select(SELECT_QUERY)
              .eq("id", newRow.id)
              .single();

            if (data) {
              const mapped = mapIncidencia(data);
              if (["CRITICA", "ALTA"].includes(mapped.priority)) playAlarm();
              setAlerts((prev) => sortAlerts([mapped, ...prev]));
            }
          }

          if (eventType === "UPDATE") {
            const mapped = mapIncidencia(newRow);
            setAlerts((prev) =>
              sortAlerts(
                prev.map((a) => (a.id === mapped.id ? mapped : a))
              )
            );
          }

          if (eventType === "DELETE") {
            const deletedId = oldRow.id;
            setAlerts((prev) => prev.filter((a) => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Acuse de Recibo (CA-3) ─────────────────────────────────────────────────
  const acknowledgeAlert = useCallback(async (alertId, operatorId) => {
    const { error } = await supabase
      .from(TABLE)
      .update({
        estado:         "EN_GESTION",
        atendido_por:   operatorId,
        fecha_atencion: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      console.error("Error al hacer acuse de recibo:", error.message);
      return false;
    }
    return true;
  }, []);

  // ── Resolver incidencia ───────────────────────────────────────────────────
  const resolveAlert = useCallback(async (alertId) => {
    const { error } = await supabase
      .from(TABLE)
      .update({
        estado:            "RESUELTO",
        fecha_resolucion:  new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      console.error("Error al resolver incidencia:", error.message);
      return false;
    }
    return true;
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



