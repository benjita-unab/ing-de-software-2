import { useEffect, useRef, type MutableRefObject } from 'react';
import { syncPendingConductorMessages } from '../services/mensajesConductorService';

const FIB_SECONDS = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];

function delayMsForFailureIndex(failureIndex: number) {
  const idx = Math.min(Math.max(failureIndex, 0), FIB_SECONDS.length - 1);
  return FIB_SECONDS[idx] * 1000;
}

export type UseMensajesQueueSchedulerParams = {
  rutaId: string | null | undefined;
  queueRef: MutableRefObject<any[]>;
  applySyncedIds: (syncedIds: string[]) => Promise<void>;
  setIsSyncing: (value: boolean) => void;
  queueRevision: string;
};

export function useMensajesQueueScheduler({
  rutaId,
  queueRef,
  applySyncedIds,
  setIsSyncing,
  queueRevision,
}: UseMensajesQueueSchedulerParams) {
  const isSyncingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureIndexRef = useRef(0);
  const mountedRef = useRef(true);
  const lastPendingKeyRef = useRef('');

  const clearScheduledTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const getPending = () => queueRef.current.filter((item) => !item.synced);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearScheduledTimeout();
    };
  }, []);

  useEffect(() => {
    clearScheduledTimeout();
    failureIndexRef.current = 0;
    lastPendingKeyRef.current = '';
  }, [rutaId]);

  useEffect(() => {
    const route = String(rutaId ?? '').trim();
    if (!route) {
      return;
    }

    const pending = getPending();
    const key = pending.map((item) => item.id).sort().join('|');

    if (pending.length === 0) {
      clearScheduledTimeout();
      failureIndexRef.current = 0;
      lastPendingKeyRef.current = '';
      return;
    }

    const last = lastPendingKeyRef.current;
    if (!last) {
      lastPendingKeyRef.current = key;
      failureIndexRef.current = 0;
      clearScheduledTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void runSync();
      }, delayMsForFailureIndex(0));
      return;
    }

    if (key !== last) {
      const prevIds = new Set(last.split('|').filter(Boolean));
      const added = pending.some((item) => !prevIds.has(item.id));
      lastPendingKeyRef.current = key;
      if (added) {
        failureIndexRef.current = 0;
        clearScheduledTimeout();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          void runSync();
        }, delayMsForFailureIndex(0));
      }
    }
  }, [rutaId, queueRevision]);

  async function runSync() {
    const route = String(rutaId ?? '').trim();
    if (!mountedRef.current || !route) return;
    if (isSyncingRef.current) return;

    const pending = getPending();
    if (pending.length === 0) {
      clearScheduledTimeout();
      failureIndexRef.current = 0;
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const syncedIds = await syncPendingConductorMessages(pending);
      if (syncedIds.length > 0) {
        await applySyncedIds(syncedIds);
      }
      failureIndexRef.current = 0;

      const stillPending = getPending();
      if (stillPending.length === 0) {
        clearScheduledTimeout();
        lastPendingKeyRef.current = '';
        return;
      }

      lastPendingKeyRef.current = stillPending.map((item) => item.id).sort().join('|');
      clearScheduledTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void runSync();
      }, delayMsForFailureIndex(0));
    } catch {
      failureIndexRef.current += 1;
      const delayMs = delayMsForFailureIndex(failureIndexRef.current);
      clearScheduledTimeout();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void runSync();
      }, delayMs);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }
}
