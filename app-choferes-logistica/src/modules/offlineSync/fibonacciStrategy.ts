/**
 * fibonacciStrategy.ts
 * Genera delays de reintento basados en la secuencia de Fibonacci.
 * Cuanto más veces falla, más tiempo espera antes del próximo intento.
 */

const FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
const BASE_DELAY_MS = 5_000; // 5 segundos base

/**
 * Retorna el delay en milisegundos para el intento número `attempt`.
 * El índice se clampea al último valor de la secuencia si supera el límite.
 *
 * attempt=0 → 5s, attempt=1 → 5s, attempt=2 → 10s, attempt=3 → 15s ...
 */
export function getFibonacciDelay(attempt: number): number {
  const index = Math.min(attempt, FIBONACCI_SEQUENCE.length - 1);
  return FIBONACCI_SEQUENCE[index] * BASE_DELAY_MS;
}
