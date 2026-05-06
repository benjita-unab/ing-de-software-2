import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';

function mapMensaje(row) {
  return {
    id: row.id,
    ruta_id: row.ruta_id,
    mensaje: row.mensaje,
    tipo: row.tipo || 'ESTADO',
    prioridad: row.prioridad || 'NORMAL',
    latitud: row.latitud ?? null,
    longitud: row.longitud ?? null,
    timestamp_evento: row.timestamp_evento || row.created_at || new Date().toISOString(),
    acknowledged: row.acknowledged ?? false,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function sortMensajes(mensajes) {
  return [...mensajes].sort((a, b) => {
    // Emergencias no acusadas flotan hacia arriba
    const aIsUrgent = a.prioridad === 'ALTA' && !a.acknowledged;
    const bIsUrgent = b.prioridad === 'ALTA' && !b.acknowledged;
    
    if (aIsUrgent !== bIsUrgent) {
      return aIsUrgent ? -1 : 1;
    }
    
    // Dentro del mismo grupo, ordenar por timestamp descendente
    return new Date(b.timestamp_evento) - new Date(a.timestamp_evento);
  });
}

export function useMensajesConductor() {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMensajes = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/api/mensajes-conductor');
      if (!res.ok) {
        throw new Error(res.error || `HTTP ${res.status}`);
      }
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMensajes(sortMensajes(data.map(mapMensaje)));
    } catch (error) {
      console.error('Error cargando mensajes de conductor:', error?.message || error);
      setError(error?.message || 'Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    void fetchMensajes();
  }, [fetchMensajes]);

  // Polling cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMensajes();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMensajes]);

  const acknowledgeMensaje = useCallback(async (mensajeId) => {
    try {
      const res = await apiFetch(`/api/mensajes-conductor/${mensajeId}/acknowledge`, {
        method: 'PATCH',
        json: {},
      });
      if (!res.ok) {
        return { ok: false, message: res.error || `HTTP ${res.status}` };
      }
      // Refrescar lista tras acknowledge
      await fetchMensajes();
      return { ok: true };
    } catch (error) {
      const msg = error?.message || 'No se pudo confirmar recepción.';
      console.error('Error acknowledge mensaje:', msg);
      return { ok: false, message: msg };
    }
  }, [fetchMensajes]);

  return { mensajes, loading, error, acknowledgeMensaje };
}
