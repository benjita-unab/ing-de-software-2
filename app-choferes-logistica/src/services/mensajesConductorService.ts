import AsyncStorage from '@react-native-async-storage/async-storage';
import { bffFetch } from './bffService';

export type ConductorMessageQueueItem = {
  id: string;
  ruta_id: string;
  mensaje: string;
  tipo: 'ESTADO' | 'EMERGENCIA';
  prioridad: 'NORMAL' | 'ALTA';
  latitud: number | null;
  longitud: number | null;
  timestamp: string;
  synced: boolean;
};

const STORAGE_PREFIX = 'hu9_mensajes_conductor_queue_';

export function buildMensajeStorageKey(rutaId: string) {
  const normalized = String(rutaId ?? '').trim();
  return normalized ? `${STORAGE_PREFIX}${normalized}` : `${STORAGE_PREFIX}sin_ruta`;
}

export async function loadMensajeQueue(rutaId: string) {
  try {
    const raw = await AsyncStorage.getItem(buildMensajeStorageKey(rutaId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveMensajeQueue(rutaId: string, queue: ConductorMessageQueueItem[]) {
  await AsyncStorage.setItem(buildMensajeStorageKey(rutaId), JSON.stringify(queue));
}

export async function sendConductorMessage(message: ConductorMessageQueueItem) {
  const payload = {
    id: message.id,
    ruta_id: message.ruta_id,
    mensaje: message.mensaje,
    tipo: message.tipo,
    prioridad: message.prioridad,
    latitud: message.latitud,
    longitud: message.longitud,
    timestamp_evento: message.timestamp,
  };

  const response = await bffFetch('/api/mensajes-conductor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return true;
  }

  const body = await response.json().catch(() => null);
  const code = body?.code || body?.error?.code;
  if (response.status === 409 || code === '23505') {
    return true;
  }

  return false;
}

export async function syncPendingConductorMessages(
  queue: ConductorMessageQueueItem[],
) {
  const syncedIds: string[] = [];

  for (const message of queue.filter((item) => !item.synced)) {
    try {
      const ok = await sendConductorMessage(message);
      if (ok) {
        syncedIds.push(message.id);
      }
    } catch {
      // Mantener en cola para reintentos posteriores.
    }
  }

  return syncedIds;
}
