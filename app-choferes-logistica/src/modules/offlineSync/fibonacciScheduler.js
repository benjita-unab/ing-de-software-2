/**
 * fibonacciScheduler.js
 *
 * Lógica pura del scheduler con backoff Fibonacci.
 * No depende de React ni de AsyncStorage.
 * Diseñado para ser usado desde un hook de React.
 *
 * Secuencia de intervalos (segundos): 2, 3, 5, 8, 13, 21
 * - Al éxito: se resetea al índice 0 (2 s).
 * - Al fallo: avanza al siguiente índice (cap en el último valor).
 */

/** Secuencia Fibonacci de intervalos en milisegundos */
const FIBONACCI_INTERVALS_MS = [2000, 3000, 5000, 8000, 13000, 21000];

/**
 * Crea una instancia del scheduler.
 *
 * @param {object} options
 * @param {() => Promise<void>} options.onTick  - Función async a ejecutar en cada tick.
 *                                                Debe lanzar error si falla la sincronización.
 * @param {() => void}          options.onReset - Callback cuando el contador Fibonacci se resetea (éxito).
 * @param {() => void}          options.onBackoff - Callback cuando el intervalo aumenta (fallo).
 * @returns {{ start: () => void, stop: () => void, reset: () => void }}
 */
export function createFibonacciScheduler({ onTick, onReset, onBackoff }) {
  let timerId = null;
  let fibIndex = 0;
  let isRunning = false; // lock para evitar ticks concurrentes

  function getCurrentInterval() {
    return FIBONACCI_INTERVALS_MS[Math.min(fibIndex, FIBONACCI_INTERVALS_MS.length - 1)];
  }

  function scheduleNext() {
    if (timerId !== null) return; // ya hay un timer activo → no duplicar
    timerId = setTimeout(tick, getCurrentInterval());
  }

  async function tick() {
    timerId = null; // liberar ref antes de ejecutar (ya se consumió)

    if (isRunning) return; // si hay un tick en curso, ignorar
    isRunning = true;

    try {
      await onTick();
      // Éxito: resetear índice Fibonacci
      fibIndex = 0;
      if (onReset) onReset();
    } catch (_err) {
      // Fallo: avanzar en la secuencia Fibonacci
      fibIndex = Math.min(fibIndex + 1, FIBONACCI_INTERVALS_MS.length - 1);
      if (onBackoff) onBackoff(getCurrentInterval());
    } finally {
      isRunning = false;
      // Después de cada tick (exitoso o fallido), reagendar el siguiente
      // La decisión de continuar o detenerse la toma el hook desde afuera
      // via stop() o dejando que scheduleNext() actúe.
      scheduleNext();
    }
  }

  return {
    /** Inicia el scheduler. Si ya está activo, no hace nada. */
    start() {
      scheduleNext();
    },

    /** Detiene el scheduler limpiamente. */
    stop() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    },

    /** Resetea el índice Fibonacci manualmente (llamar tras éxito externo). */
    reset() {
      fibIndex = 0;
    },

    /** Expone el intervalo actual (útil para debugging / logs). */
    getCurrentIntervalMs() {
      return getCurrentInterval();
    },
  };
}
