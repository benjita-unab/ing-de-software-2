// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook principal de la HU-2: se suscribe a Supabase Realtime y mantiene
// la cola de alertas ordenada por prioridad + timestamp.
// Cuando llegue tu schema real, ajusta el nombre de la tabla en TABLE_NAME.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const TABLE_NAME = "alerts"; // ← cambia al nombre real de tu tabla

// Orden de prioridad: menor número = mayor urgencia
const PRIORITY_ORDER = { CRITICA: 0, ALTA: 1, NORMAL: 2, BAJA: 3 };

function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;           // CA-1: prioridad primero
    return new Date(b.created_at) - new Date(a.created_at); // luego más reciente
  });
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAlerts() {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .in("status", ["PENDIENTE", "EN_GESTION"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAlerts(sortAlerts(data));
      }
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  // ── Supabase Realtime subscription (CA-4: ≤ 3 segundos) ──────────────────
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "INSERT") {
            // Si es CRITICA o ALTA → sonar alarma
            if (["CRITICA", "ALTA"].includes(newRecord.priority)) {
              playAlarm();
            }
            setAlerts((prev) => sortAlerts([newRecord, ...prev]));
          }

          if (eventType === "UPDATE") {
            setAlerts((prev) =>
              sortAlerts(
                prev.map((a) => (a.id === newRecord.id ? newRecord : a))
              ).filter((a) => ["PENDIENTE", "EN_GESTION"].includes(a.status))
            );
          }

          if (eventType === "DELETE") {
            setAlerts((prev) => prev.filter((a) => a.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Alarma sonora (CA-1) ───────────────────────────────────────────────────
  function playAlarm() {
    try {
      // Genera un beep sintético con Web Audio API (no requiere archivo de audio)
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio no disponible:", e);
    }
  }

  // ── Acuse de Recibo (CA-3) ────────────────────────────────────────────────
  const acknowledgeAlert = useCallback(async (alertId, operatorId) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        status: "EN_GESTION",
        acknowledged_by: operatorId,
        acknowledged_at: now,
      })
      .eq("id", alertId);

    if (error) {
      console.error("Error al hacer acuse de recibo:", error);
      return false;
    }
    return true;
  }, []);

  // ── Resolver alerta ───────────────────────────────────────────────────────
  const resolveAlert = useCallback(async (alertId) => {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ status: "RESUELTA", resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      console.error("Error al resolver alerta:", error);
      return false;
    }
    return true;
  }, []);

  return { alerts, loading, acknowledgeAlert, resolveAlert };
}
