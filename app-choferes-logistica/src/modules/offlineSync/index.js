/**
 * index.js  ·  src/modules/offlineSync/
 *
 * Punto de entrada público del módulo offlineSync.
 * Re-exporta la API que el resto de la aplicación debe consumir.
 *
 * Importaciones externas usan SOLO este archivo:
 *   import { createFibonacciScheduler } from '../modules/offlineSync';
 */

export { createFibonacciScheduler } from './fibonacciScheduler';
