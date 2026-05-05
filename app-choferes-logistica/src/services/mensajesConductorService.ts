import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
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

/**
 * Captura las coordenadas GPS actuales del conductor.
 * Retorna [latitud, longitud] o [null, null] si falla.
 */
async function captureGpsLocation(): Promise<[number | null, number | null]> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      return [null, null];
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return [position.coords.latitude, position.coords.longitude];
  } catch {
    return [null, null];
  }
}

/**
 * Crea un nuevo mensaje con ID único, captura GPS, y lo agrega a la cola local.
 * Retorna el mensaje creado.
 */
export async function enqueueConductorMessage(
  rutaId: string,
  label: string,
  tipo: 'ESTADO' | 'EMERGENCIA',
  prioridad: 'NORMAL' | 'ALTA',
): Promise<ConductorMessageQueueItem> {
  const [latitud, longitud] = await captureGpsLocation();

  const newMessage: ConductorMessageQueueItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ruta_id: rutaId,
    mensaje: label,
    tipo,
    prioridad,
    latitud,
    longitud,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  // Cargar cola actual
  const currentQueue = await loadMensajeQueue(rutaId);

  // Agregar nuevo mensaje
  const updatedQueue = [...currentQueue, newMessage];

  // Guardar en AsyncStorage
  await saveMensajeQueue(rutaId, updatedQueue);

  return newMessage;
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
