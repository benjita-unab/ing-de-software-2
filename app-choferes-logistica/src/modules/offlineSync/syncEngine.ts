/**
 * syncEngine.ts
 * Motor de sincronización offline → API REST (LogiTrack Backend).
 *
 * Flujo por cada registro pendiente:
 *   1. POST /api/storage/upload  → sube la foto y obtiene la URL pública
 *   2. POST /api/trazabilidad    → registra el evento con la URL recibida
 *
 * Si cualquiera de los dos pasos falla, se aplica Fibonacci backoff
 * y se reintenta en el próximo ciclo del scheduler.
 *
 * NO depende de @supabase/supabase-js.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFibonacciDelay } from './fibonacciStrategy';
import {
  getPendingRecords,
  markAsSynced,
  type QueueRecord,
} from './syncQueueStorage';

// ─── Configuración ──────────────────────────────────────────────────────────

/**
 * URL base del backend.
 * Para pruebas en dispositivo físico, cambia 'localhost' por la IP de tu
 * máquina en la red local, ej. 'http://192.168.1.X:3000/api'.
 */
const API_URL = 'http://localhost:3000/api';

/**
 * Clave donde el token JWT de sesión está guardado en AsyncStorage.
 * Ajusta al key real que tu app persiste después del login.
 */
const AUTH_TOKEN_KEY = 'session_access_token';

// ─── Estado interno del motor ────────────────────────────────────────────────

interface EngineState {
  isRunning: boolean;
  attempt: number;
  schedulerTimer: ReturnType<typeof setTimeout> | null;
  pendingCount: number;
  onPendingCountChange: ((count: number) => void) | null;
}

const state: EngineState = {
  isRunning: false,
  attempt: 0,
  schedulerTimer: null,
  pendingCount: 0,
  onPendingCountChange: null,
};

// ─── Helpers internos ────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('No hay token de sesión disponible. El usuario debe estar autenticado.');
  }
  return token;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function notifyPendingCount(): Promise<void> {
  const pending = await getPendingRecords();
  state.pendingCount = pending.length;
  state.onPendingCountChange?.(state.pendingCount);
}

// ─── Paso A: Subir foto al backend ───────────────────────────────────────────

/**
 * Lee el archivo local y lo envía como multipart/form-data al endpoint de Storage.
 * Devuelve la URL pública del archivo en el CDN de Supabase.
 */
async function uploadPhoto(record: QueueRecord, token: string): Promise<string> {
  // Verificar que el archivo local existe antes de intentar leerlo
  const fileInfo = await FileSystem.getInfoAsync(record.photoUri);
  if (!fileInfo.exists) {
    throw new Error(`Archivo local no encontrado para el registro ${record.id}: ${record.photoUri}`);
  }

  // React Native FormData acepta { uri, type, name } directamente
  const ext = record.photoUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

  const formData = new FormData();
  // @ts-ignore — React Native FormData acepta este shape para files
  formData.append('file', {
    uri: record.photoUri,
    type: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
    name: `${record.id}.${safeExt}`,
  });

  const response = await fetch(
    `${API_URL}/storage/upload?folder=${encodeURIComponent(record.stage.toLowerCase())}`,
    {
      method: 'POST',
      headers: authHeaders(token), // NO incluir Content-Type; fetch lo pone solo con FormData
      body: formData,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Upload] HTTP ${response.status}: ${errorBody}`);
  }

  const json = (await response.json()) as { publicUrl: string };

  if (!json.publicUrl) {
    throw new Error(`[Upload] La respuesta del servidor no contiene 'publicUrl'.`);
  }

  return json.publicUrl;
}

// ─── Paso B: Registrar evento de trazabilidad ────────────────────────────────

async function registerTraceabilityEvent(
  record: QueueRecord,
  photoUri: string,
  token: string
): Promise<void> {
  const body = JSON.stringify({
    id: record.id,
    stage: record.stage,
    photoUri,
    latitude: record.latitude,
    longitude: record.longitude,
    timestamp: record.timestamp,
  });

  const response = await fetch(`${API_URL}/trazabilidad`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Trazabilidad] HTTP ${response.status}: ${errorBody}`);
  }
}

// ─── Procesamiento de la cola ────────────────────────────────────────────────

/**
 * Recorre todos los registros pendientes y ejecuta el flujo de dos pasos
 * para cada uno. Si alguno falla, lanza el error para que el scheduler
 * aplique Fibonacci backoff.
 *
 * Los registros se procesan en secuencia (no en paralelo) para evitar
 * saturar la red en dispositivos móviles.
 */
async function processQueue(): Promise<number> {
  const pending = await getPendingRecords();

  if (pending.length === 0) {
    return 0;
  }

  const token = await getAuthToken();
  const syncedIds: string[] = [];

  for (const record of pending) {
    // Paso A: subir foto
    const publicUrl = await uploadPhoto(record, token);

    // Paso B: registrar trazabilidad con la URL obtenida
    await registerTraceabilityEvent(record, publicUrl, token);

    syncedIds.push(record.id);
  }

  // Persistir el estado actualizado solo si hubo éxitos
  if (syncedIds.length > 0) {
    await markAsSynced(syncedIds);
  }

  return syncedIds.length;
}

// ─── Scheduler con Fibonacci backoff ─────────────────────────────────────────

function scheduleNextRun(delayMs: number): void {
  if (state.schedulerTimer) {
    clearTimeout(state.schedulerTimer);
  }
  state.schedulerTimer = setTimeout(() => void runSyncCycle(), delayMs);
}

async function runSyncCycle(): Promise<void> {
  if (!state.isRunning) return;

  try {
    const syncedCount = await processQueue();

    if (syncedCount > 0) {
      console.log(`[SyncEngine] ✓ ${syncedCount} registro(s) sincronizado(s).`);
    }

    // Éxito: resetear intentos y volver al intervalo base (30s)
    state.attempt = 0;
    await notifyPendingCount();

    const BASE_INTERVAL_MS = 30_000;
    scheduleNextRun(BASE_INTERVAL_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[SyncEngine] ✗ Intento ${state.attempt + 1} fallido: ${message}`);

    state.attempt += 1;
    const delay = getFibonacciDelay(state.attempt);
    console.log(`[SyncEngine] Reintentando en ${delay / 1000}s...`);
    scheduleNextRun(delay);
  }
}

// ─── API pública del módulo ──────────────────────────────────────────────────

/**
 * Inicia el motor de sincronización en background.
 * Idempotente: si ya está corriendo, no hace nada.
 *
 * @param onPendingCountChange - Callback opcional para actualizar la UI
 *        con el número de registros pendientes.
 */
export function startSyncEngine(
  onPendingCountChange?: (count: number) => void
): void {
  if (state.isRunning) return;

  state.isRunning = true;
  state.attempt = 0;
  state.onPendingCountChange = onPendingCountChange ?? null;

  console.log('[SyncEngine] Motor iniciado.');
  void runSyncCycle();
}

/**
 * Detiene el motor y limpia el timer del scheduler.
 */
export function stopSyncEngine(): void {
  state.isRunning = false;
  if (state.schedulerTimer) {
    clearTimeout(state.schedulerTimer);
    state.schedulerTimer = null;
  }
  console.log('[SyncEngine] Motor detenido.');
}

/**
 * Dispara una sincronización inmediata fuera del ciclo del scheduler.
 * Útil para cuando el usuario pulsa "Sincronizar ahora".
 * Devuelve cuántos registros se sincronizaron.
 */
export async function syncNow(): Promise<number> {
  try {
    const count = await processQueue();
    state.attempt = 0; // éxito → reset backoff
    await notifyPendingCount();
    return count;
  } catch (error) {
    state.attempt += 1;
    throw error; // propagar al caller para que muestre el error en la UI
  }
}

/**
 * Devuelve el número actual de registros pendientes de sincronizar.
 */
export function getPendingCount(): number {
  return state.pendingCount;
}
