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
  EMERGENCIA:   "EMERGENCIA",
  ALERTA:       "ALERTA",
  NORMAL:       "NORMAL",
  DESVIO:       "DESVIO_RUTA",
  DESVIO_RUTA:  "DESVIO_RUTA",
  ANOMALIA:     "ANOMALIA",
  MANTENCION:   "MANTENCION",
};

const ESTADO_MAP = {
  PENDIENTE:  "PENDIENTE",
  pendiente:  "PENDIENTE",
  "en curso": "EN_GESTION",
  EN_GESTION: "EN_GESTION",
  en_gestion: "EN_GESTION",
  ATENDIDO:   "EN_GESTION",
  atendido:   "EN_GESTION",
  RESUELTO:   "RESUELTA",
  resuelto:   "RESUELTA",
  RESUELTA:   "RESUELTA",
  resuelta:   "RESUELTA",
};

const PRIORIDAD_MAP = {
  CRITICA:  "CRITICA",
  critica:  "CRITICA",
  ALTA:     "ALTA",
  alta:     "ALTA",
  MEDIA:    "NORMAL",
  media:    "NORMAL",
  NORMAL:   "NORMAL",
  normal:   "NORMAL",
  BAJA:     "BAJA",
  baja:     "BAJA",
};

// ── Normaliza una fila de `incidencias` al formato de la UI ─────────────────
function mapIncidencia(row) {
  console.log("Fila recibida de Supabase:", row); // Para poder ver en la consola web exactamente qué está trayendo

  const conductor = row.conductores || {};
  
  // Probamos multiples variaciones comunes por las que Supabase puede retornar el nombre:
  let driverName = "—";
  if (conductor.usuarios) {
    if (Array.isArray(conductor.usuarios) && conductor.usuarios.length > 0) {
      driverName = conductor.usuarios[0].nombre || "—";
    } else if (conductor.usuarios.nombre) {
      driverName = conductor.usuarios.nombre;
    }
  } else if (conductor.usuario && conductor.usuario.nombre) {
    driverName = conductor.usuario.nombre;
  }

  // Si envías el nombre directamente en la tabla incidencias, tiene prioridad
  if (row.conductor_nombre) {
    driverName = row.conductor_nombre;
  }

  // Patente: puede estar en camiones (via rutas) o en el row directamente
  const vehiclePlate =
    row.camiones?.patente ??
    row.rutas?.camiones?.patente ??
    row.patente ??
    row.vehiculo_patente ??
    "—";

// Resolviendo el Enum de la base de datos
    let computedStatus = ESTADO_MAP[row.estado?.toLowerCase()] ?? ESTADO_MAP[row.estado] ?? "PENDIENTE";

    return {
      // Identificadores
      id:                row.identificación ?? row.id,
      _original_id:      row.identificación ?? row.id,

      // Tipo y prioridad
      alert_type:        TIPO_MAP[row.tipo?.toUpperCase()] ?? TIPO_MAP[row.tipo] ?? row.tipo ?? "ANOMALIA",
      priority:          PRIORIDAD_MAP[row.prioridad] ?? "ALTA",
      status:            computedStatus,

    // Datos del conductor y vehículo (CA-2)
    driver_name:       driverName,
    vehicle_plate:     vehiclePlate,
    description:       row.descripción ?? row.descripcion ?? "",

    // Ubicación (para enlace Google Maps)
    lat:               row.latitud  ?? row.lat  ?? null,
    lng:               row.longitud ?? row.long ?? row.lng  ?? null,
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
    usuario_id,
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
        // --- JOIN MANUAL DE EMERGENCIA PARA NOMBRES (Si falla Supabase) ---
        const rows = [...data];
        
        // Extraemos IDs únicos de conductores si el join automático de PostgREST falló
        const conductorIds = [...new Set(rows.map((r) => r.conductor_id).filter(Boolean))];
        
        if (conductorIds.length > 0) {
          // Buscamos los datos de esos conductores
          const { data: rawConductores } = await supabase
            .from("conductores")
            .select("*")
            .in("id", conductorIds);
            
          if (rawConductores && rawConductores.length > 0) {
            // Buscamos los usuarios asociados a esos conductores
            const usuarioIds = [...new Set(rawConductores.map((c) => c.usuario_id).filter(Boolean))];
            let rawUsuarios = [];
            
            if (usuarioIds.length > 0) {
              const { data: usersData } = await supabase
                .from("usuarios")
                .select("id, nombre")
                .in("id", usuarioIds);
              rawUsuarios = usersData || [];
            }
            
            // Inyectamos el nombre del conductor a las filas si es que faltaba (el fallback entra en acción)
            rows.forEach((row) => {
              if (row.conductor_id && !row.conductor_nombre) {
                const cond = rawConductores.find((c) => c.id === row.conductor_id);
                if (cond) {
                  const usr = rawUsuarios.find((u) => u.id === cond.usuario_id);
                  if (usr) row.conductor_nombre = usr.nombre;
                }
              }
            });
          }
        }

        // --- FULL JOIN MANUAL PARA PATENTES (Si falla o falta foreign key en Supabase) ---
        const rutaIds = [...new Set(rows.map((r) => r.ruta_id).filter(Boolean))];
        if (rutaIds.length > 0) {
          const { data: rawRutas } = await supabase.from("rutas").select("id, camion_id").in("id", rutaIds);
          if (rawRutas && rawRutas.length > 0) {
            const camionIds = [...new Set(rawRutas.map((r) => r.camion_id).filter(Boolean))];
            if (camionIds.length > 0) {
              const { data: rawCamiones } = await supabase.from("camiones").select("id, patente").in("id", camionIds);
              if (rawCamiones) {
                rows.forEach((row) => {
                  if (row.ruta_id && !row.vehiculo_patente && !row.rutas?.camiones?.patente) {
                    const rut = rawRutas.find((r) => r.id === row.ruta_id);
                    if (rut && rut.camion_id) {
                      const cam = rawCamiones.find((c) => c.id === rut.camion_id);
                      if (cam) row.vehiculo_patente = cam.patente;
                    }
                  }
                });
              }
            }
          }
        }
        // ------------------------------------------------------------------

        setAlerts(sortAlerts(rows.map(mapIncidencia)));
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
              const row = { ...data };
              // --- FULL JOIN MANUAL DE NUEVA FILA ---
              if (row.conductor_id && !row.conductor_nombre) {
                const { data: cond } = await supabase.from("conductores").select("*").eq("id", row.conductor_id).single();
                if (cond && cond.usuario_id) {
                  const { data: usr } = await supabase.from("usuarios").select("nombre").eq("id", cond.usuario_id).single();
                  if (usr) row.conductor_nombre = usr.nombre;
                }
              }
              if (row.ruta_id && !row.vehiculo_patente && !row.rutas?.camiones?.patente) {
                const { data: rut } = await supabase.from("rutas").select("camion_id").eq("id", row.ruta_id).single();
                if (rut && rut.camion_id) {
                  const { data: cam } = await supabase.from("camiones").select("patente").eq("id", rut.camion_id).single();
                  if (cam) row.vehiculo_patente = cam.patente;
                }
              }
              // ------------------------------------
              const mapped = mapIncidencia(row);
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
        estado:         "en curso", 
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
        estado:            "resuelto",
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



