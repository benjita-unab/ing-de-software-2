import { useEffect, useRef } from "react";
import {
  syncTraceabilityRecords,
  type TraceabilityRecord,
} from "../services/syncEngine";

const FIB_SECONDS = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];

function delayMsForFailureIndex(failureIndex: number): number {
  const idx = Math.min(
    Math.max(failureIndex, 0),
    FIB_SECONDS.length - 1,
  );
  return FIB_SECONDS[idx] * 1000;
}

export type LocalTraceRecord = TraceabilityRecord & {
  synced?: boolean;
  etapa?: string;
  tipo?: string;
};

export type UseAutoSyncSchedulerParams = {
  rutaId: string | null | undefined;
  registrosRef: React.MutableRefObject<LocalTraceRecord[]>;
  applySyncedIds: (syncedIds: string[]) => Promise<void>;
  setIsSyncing: (v: boolean) => void;
  recordsRevision: string;
};

function buildPendingKey(records: LocalTraceRecord[]): string {
  return records
    .filter((r) => !r.synced)
    .map((r) => r.id)
    .sort()
    .join("|");
}

export function useAutoSyncScheduler({
  rutaId,
  registrosRef,
  applySyncedIds,
  setIsSyncing,
  recordsRevision,
}: UseAutoSyncSchedulerParams): void {
  const isSyncingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureIndexRef = useRef(0);
  const mountedRef = useRef(true);
  const lastPendingKeyRef = useRef("");

  const applySyncedIdsRef = useRef(applySyncedIds);
  applySyncedIdsRef.current = applySyncedIds;

  const setIsSyncingRef = useRef(setIsSyncing);
  setIsSyncingRef.current = setIsSyncing;

  const rutaIdRef = useRef(rutaId);
  rutaIdRef.current = rutaId;

  const clearScheduledTimeout = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const getUnsynced = () =>
    registrosRef.current.filter((r) => !r.synced);

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
    lastPendingKeyRef.current = "";
  }, [rutaId]);

  useEffect(() => {
    const route = String(rutaId ?? "").trim();
    if (!route) return;

    const unsynced = registrosRef.current.filter((r) => !r.synced);
    const key = buildPendingKey(registrosRef.current);

    if (unsynced.length === 0) {
      clearScheduledTimeout();
      failureIndexRef.current = 0;
      lastPendingKeyRef.current = "";
      return;
    }

    const last = lastPendingKeyRef.current;

    if (last === "") {
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
      const prevIds = new Set(last.split("|").filter(Boolean));
      const added = unsynced.some((r) => !prevIds.has(r.id));
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
  }, [rutaId, recordsRevision]);

  async function runSync() {
    const route = String(rutaIdRef.current ?? "").trim();
    if (!mountedRef.current || !route) return;
    if (isSyncingRef.current) return;

    const pending = getUnsynced();
    if (pending.length === 0) {
      clearScheduledTimeout();
      failureIndexRef.current = 0;
      return;
    }

    isSyncingRef.current = true;
    setIsSyncingRef.current(true);

    try {
      const syncedIds = await syncTraceabilityRecords(pending, route);
      await applySyncedIdsRef.current(syncedIds);
      failureIndexRef.current = 0;

      const still = getUnsynced();
      if (still.length === 0) {
        clearScheduledTimeout();
        lastPendingKeyRef.current = "";
        return;
      }

      lastPendingKeyRef.current = buildPendingKey(registrosRef.current);

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
      setIsSyncingRef.current(false);
    }
  }
}
