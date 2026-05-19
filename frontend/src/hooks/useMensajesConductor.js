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

function rutaLabelFromApi(ruta = {}, fallbackId = 'Sin ruta') {
  const nombre = String(ruta.nombre ?? '').trim();
  if (nombre) {
    return nombre;
  }
  const origen = String(ruta.origen ?? '').trim() || '—';
  const destino = String(ruta.destino ?? '').trim() || '—';
  return `${origen} → ${destino}`;
}

export function sortMensajes(mensajes) {
  return [...mensajes].sort((a, b) => {
    const aIsUrgent = a.prioridad === 'ALTA' && !a.acknowledged;
    const bIsUrgent = b.prioridad === 'ALTA' && !b.acknowledged;

    if (aIsUrgent !== bIsUrgent) {
      return aIsUrgent ? -1 : 1;
    }

    return new Date(b.timestamp_evento) - new Date(a.timestamp_evento);
  });
}

export function groupMensajesByRuta(mensajes, rutaFilter = '', rutaMap = {}) {
  const normalizedFilter = String(rutaFilter || '').trim().toLowerCase();

  const groups = mensajes.reduce((acc, mensaje) => {
    const key = mensaje.ruta_id || 'SIN_RUTA';
    const existing = acc[key] || {
      rutaId: key,
      rutaLabel: rutaLabelFromApi(rutaMap[key], key),
      mensajes: [],
      hasUrgent: false,
      latestTimestamp: mensaje.timestamp_evento,
    };

    existing.mensajes.push(mensaje);
    existing.hasUrgent = existing.hasUrgent || (mensaje.prioridad === 'ALTA' && !mensaje.acknowledged);

    if (new Date(mensaje.timestamp_evento) > new Date(existing.latestTimestamp)) {
      existing.latestTimestamp = mensaje.timestamp_evento;
    }

    acc[key] = existing;
    return acc;
  }, {});

  const grouped = Object.values(groups).map((group) => ({
    ...group,
    rutaLabel: rutaLabelFromApi(rutaMap[group.rutaId], group.rutaId),
    mensajes: sortMensajes(group.mensajes),
  }));

  const filtered = normalizedFilter
    ? grouped.filter((group) =>
        String(group.rutaLabel).toLowerCase().includes(normalizedFilter) ||
        String(group.rutaId).toLowerCase().includes(normalizedFilter),
      )
    : grouped;

  return filtered.sort((a, b) => {
    if (a.hasUrgent !== b.hasUrgent) {
      return a.hasUrgent ? -1 : 1;
    }
    return new Date(b.latestTimestamp) - new Date(a.latestTimestamp);
  });
}

export function useMensajesConductor() {
  const [mensajes, setMensajes] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [rutasMap, setRutasMap] = useState({});
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

  const fetchRutas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/rutas');
      if (!res.ok) {
        throw new Error(res.error || `HTTP ${res.status}`);
      }
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRutas(data);
      setRutasMap(
        data.reduce((acc, ruta) => {
          if (ruta?.id) {
            acc[ruta.id] = ruta;
          }
          return acc;
        }, {}),
      );
    } catch (error) {
      console.error('Error cargando rutas:', error?.message || error);
    }
  }, []);

  useEffect(() => {
    void fetchRutas();
  }, [fetchRutas]);

  useEffect(() => {
    void fetchMensajes();
  }, [fetchMensajes]);

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
      await fetchMensajes();
      return { ok: true };
    } catch (error) {
      const msg = error?.message || 'No se pudo confirmar recepción.';
      console.error('Error acknowledge mensaje:', msg);
      return { ok: false, message: msg };
    }
  }, [fetchMensajes]);

  return { mensajes, rutas, rutasMap, loading, error, acknowledgeMensaje };
}
