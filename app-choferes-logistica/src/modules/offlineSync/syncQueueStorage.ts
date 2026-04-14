/**
 * syncQueueStorage.ts
 * Capa de persistencia de la cola de sincronización usando AsyncStorage.
 * Solo gestiona la cola de records PENDIENTES (synced: false).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEUE_STORAGE_KEY = 'hu1_traceability_records';

export interface QueueRecord {
  id: string;
  stage: string;
  photoUri: string;   // URI local del archivo (documentDirectory)
  latitude: number;
  longitude: number;
  timestamp: string;  // ISO 8601
  synced: boolean;
}

/** Lee todos los registros de AsyncStorage. */
export async function getAllRecords(): Promise<QueueRecord[]> {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as QueueRecord[]) : [];
}

/** Reemplaza la lista completa de registros en AsyncStorage. */
export async function saveAllRecords(records: QueueRecord[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(records));
}

/** Devuelve solo los registros que aún no fueron sincronizados. */
export async function getPendingRecords(): Promise<QueueRecord[]> {
  const all = await getAllRecords();
  return all.filter((r) => !r.synced);
}

/**
 * Marca como `synced: true` los registros cuyos IDs estén en `syncedIds`.
 * Persiste el estado actualizado.
 */
export async function markAsSynced(syncedIds: string[]): Promise<void> {
  const all = await getAllRecords();
  const updated = all.map((r) =>
    syncedIds.includes(r.id) ? { ...r, synced: true } : r
  );
  await saveAllRecords(updated);
}
