/**
 * HU-61 — DTO para reordenar el conjunto de paradas de una ruta (Task #521).
 * El cliente envía un array con el nuevo orden deseado.
 */
export type ReorderParadasDto = {
  /**
   * Array de objetos que indica el nuevo orden.
   * El backend actualiza el campo `orden` de cada parada de forma transaccional.
   */
  paradas: Array<{
    id: string;
    orden: number;
  }>;
};
