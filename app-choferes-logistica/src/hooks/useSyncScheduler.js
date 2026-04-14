import { useEffect, useRef, useCallback } from 'react';
import { createFibonacciScheduler } from '../modules/offlineSync';

/**
 * useSyncScheduler
 *
 * Hook que ejecuta sincronización automática con backoff Fibonacci.
 *
 * Garantías de diseño:
 *  ✅ NO ejecuta si pendingCount === 0
 *  ✅ Se DETIENE automáticamente cuando pendingCount llega a 0
 *  ✅ Se REINICIA automáticamente si vuelven a aparecer pendientes
 *  ✅ Nunca genera múltiples timers simultáneos (control via schedulerRef)
 *
 * @param {object}   params
 * @param {number}   params.pendingCount     - Cantidad de registros pendientes (desde el componente padre).
 * @param {Function} params.onSync           - Función async que ejecuta la sincronización.
 *                                             Debe lanzar un error si falla para activar el backoff.
 * @param {Function} [params.onSyncSuccess]  - Callback opcional llamado tras sincronización exitosa.
 * @param {Function} [params.onSyncFailure]  - Callback opcional llamado tras un fallo, recibe (intervalMs).
 * @param {boolean}  [params.enabled=true]   - Permite desactivar el scheduler externamente (ej: viajeFinalizado).
 */
export function useSyncScheduler({
  pendingCount,
  onSync,
  onSyncSuccess,
  onSyncFailure,
  enabled = true,
}) {
  // Ref al scheduler singleton — persiste entre renders sin provocar re-renders
  const schedulerRef = useRef(null);

  // Ref estable a onSync para evitar recrear el scheduler en cada render
  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  // Crear el scheduler UNA sola vez (singleton por instancia del hook)
  if (schedulerRef.current === null) {
    schedulerRef.current = createFibonacciScheduler({
      onTick: async () => {
        // Delegamos al ref para siempre tener la versión actualizada de onSync
        await onSyncRef.current();
      },
      onReset: () => {
        if (onSyncSuccess) onSyncSuccess();
      },
      onBackoff: (intervalMs) => {
        if (onSyncFailure) onSyncFailure(intervalMs);
      },
    });
  }

  // ─── Efecto principal: arrancar o detener el scheduler según los pendientes ───
  useEffect(() => {
    const scheduler = schedulerRef.current;
    const shouldRun = enabled && pendingCount > 0;

    if (shouldRun) {
      // Solo arranca si no hay timer activo (start() es idempotente)
      scheduler.start();
    } else {
      // Detener limpiamente si no hay nada pendiente o está deshabilitado
      scheduler.stop();
    }

    // Cleanup: detener al desmontar el componente
    return () => {
      scheduler.stop();
    };
  }, [pendingCount, enabled]);
}
