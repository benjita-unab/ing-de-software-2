import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';

function mapMensaje(row) {
  return {
    id: row.id,
    ruta_id: row.ruta_id,
    mensaje: row.mensaje,
    tipo: row.tipo || 'ESTADO',
    prioridad: row.prioridad || 'NORMAL',
    latitud: row.latitud ?? row.lat ?? null,
    longitud: row.longitud ?? row.lng ?? null,
    timestamp_evento: row.timestamp_evento || row.created_at || new Date().toISOString(),
    acknowledged: row.acknowledged ?? false,
    acknowledged_at: row.acknowledged_at ?? null,
    created_at: row.created_at ?? row.fecha_creacion ?? new Date().toISOString(),
    ruta: row.rutas
      ? {
          id: row.rutas.id,
          origen: row.rutas.origen,
          destino: row.rutas.destino,
          estado: row.rutas.estado,
          camion: row.rutas.camiones?.patente,
        }
      : null,
  };
}

function sortMensajes(mensajes) {
  return [...mensajes].sort((a, b) => {
    if (a.prioridad !== b.prioridad) {
      return a.prioridad === 'ALTA' ? -1 : 1;
    }
    return new Date(b.timestamp_evento) - new Date(a.timestamp_evento);
  });
}

export function useMensajesConductor() {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMensajes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/mensajes-conductor');
      if (!res.ok) {
        throw new Error(res.error || `HTTP ${res.status}`);
      }
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMensajes(sortMensajes(data.map(mapMensaje)));
    } catch (error) {
      console.error('Error cargando mensajes de conductor:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMensajes();
  }, [fetchMensajes]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMensajes();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMensajes]);

  const acknowledgeMensaje = useCallback(async (mensajeId, operatorId) => {
    try {
      const res = await apiFetch(`/api/mensajes-conductor/${mensajeId}/acknowledge`, {
        method: 'PATCH',
        json: { operatorId },
      });
      if (!res.ok) {
        return { ok: false, message: res.error || `HTTP ${res.status}` };
      }
      await fetchMensajes();
      return { ok: true };
    } catch (error) {
      const msg = error?.message || 'No se pudo acusar el mensaje.';
      console.error('Error acknowledge mensaje conductor:', msg);
      return { ok: false, message: msg };
    }
  }, [fetchMensajes]);

  return { mensajes, loading, acknowledgeMensaje };
}
