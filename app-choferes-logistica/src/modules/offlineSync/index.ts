/**
 * offlineSync/index.ts
 * Punto de entrada público del módulo.
 * Los consumidores solo importan desde aquí, nunca de los archivos internos.
 */

export {
  startSyncEngine,
  stopSyncEngine,
  syncNow,
  getPendingCount,
} from './syncEngine';

export {
  getAllRecords,
  getPendingRecords,
  markAsSynced,
  saveAllRecords,
  QUEUE_STORAGE_KEY,
  type QueueRecord,
} from './syncQueueStorage';

export { getFibonacciDelay } from './fibonacciStrategy';
