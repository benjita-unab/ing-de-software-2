/** Cuerpo de POST /api/rutas/:id/consolidar (HU-59). */
export type ConsolidarPedidoDto = {
  pedido_id: string;
  ignorar_advertencias_ocupacion?: boolean;
  ignorar_advertencias_distancia?: boolean;
};
