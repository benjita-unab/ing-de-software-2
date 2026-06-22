/**
 * HU-40 Fase 3: chat operador ↔ conductor por ruta.
 * Independiente de useMensajesConductor / useAlertasConductor.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  enviarMensajeRuta,
  fetchConversaciones,
  fetchMensajesRuta,
  marcarChatLeido,
} from '../lib/chatRutaService';

export const CHAT_RUTA_POLL_MS = 5000;

export function useChatRuta(selectedRutaId = null) {
  const [conversaciones, setConversaciones] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [loadingConversaciones, setLoadingConversaciones] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const loadConversaciones = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchConversaciones();
      setConversaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando conversaciones:', err?.message || err);
      setError(err?.message || 'Error al cargar conversaciones');
    } finally {
      setLoadingConversaciones(false);
    }
  }, []);

  const loadMensajes = useCallback(async (rutaId) => {
    if (!rutaId) {
      setMensajes([]);
      return;
    }
    try {
      setError(null);
      const data = await fetchMensajesRuta(rutaId);
      setMensajes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando mensajes chat:', err?.message || err);
      setError(err?.message || 'Error al cargar mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  }, []);

  useEffect(() => {
    void loadConversaciones();
  }, [loadConversaciones]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadConversaciones();
    }, CHAT_RUTA_POLL_MS);
    return () => clearInterval(interval);
  }, [loadConversaciones]);

  useEffect(() => {
    if (!selectedRutaId) {
      setMensajes([]);
      return undefined;
    }

    setLoadingMensajes(true);
    void loadMensajes(selectedRutaId);
    void marcarChatLeido(selectedRutaId).then(() => {
      void loadConversaciones();
    });

    const interval = setInterval(() => {
      void loadMensajes(selectedRutaId);
      void loadConversaciones();
    }, CHAT_RUTA_POLL_MS);

    return () => clearInterval(interval);
  }, [selectedRutaId, loadMensajes, loadConversaciones]);

  const sendMensaje = useCallback(async (contenido) => {
    if (!selectedRutaId) {
      return { ok: false, message: 'Selecciona una ruta.' };
    }
    const texto = String(contenido ?? '').trim();
    if (!texto) {
      return { ok: false, message: 'Escribe un mensaje.' };
    }

    setSending(true);
    try {
      const result = await enviarMensajeRuta(selectedRutaId, texto);
      if (result.ok) {
        await loadMensajes(selectedRutaId);
        await loadConversaciones();
      }
      return result;
    } finally {
      setSending(false);
    }
  }, [selectedRutaId, loadMensajes, loadConversaciones]);

  return {
    conversaciones,
    mensajes,
    loadingConversaciones,
    loadingMensajes,
    error,
    sending,
    sendMensaje,
    refreshConversaciones: loadConversaciones,
  };
}
