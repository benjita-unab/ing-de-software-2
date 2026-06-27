/**
 * HU-59: utilidades para validar capacidad y distancia al consolidar pedidos.
 */

export const UMBRAL_OCUPACION_BAJA = 85;
export const UMBRAL_PEDIDO_LARGO_KM = 300;
export const MAX_DIST_DESTINOS_PEDIDO_LARGO_KM = 150;
export const MAX_DIST_DESTINOS_PEDIDO_CORTO_KM = 70;

export type PedidoConsolidacion = {
  id: string;
  destino: string;
  distancia_km: number | null;
};

export type AdvertenciaConsolidacion = {
  tipo: 'ocupacion_baja' | 'ocupacion_excedida' | 'distancia_destinos';
  mensaje: string;
  bloqueante: boolean;
};

export type CapacidadRuta = {
  slots: number;
  slots_utilizados_ruta: number;
  slots_disponibles: number;
  porcentaje_ocupacion: number;
  talla: string;
};

export function calcularTalla(slots: number): string {
  if (slots <= 32) return 'CHICO';
  if (slots <= 64) return 'MEDIANO';
  return 'GRANDE';
}

export function calcularCapacidadRuta(
  slotsCamion: number,
  bultosPorPedido: number[],
): CapacidadRuta {
  const slots = Math.max(slotsCamion || 0, 1);
  const slots_utilizados_ruta = bultosPorPedido.reduce(
    (sum, b) => sum + Math.max(0, b || 0),
    0,
  );
  const slots_disponibles = Math.max(0, slots - slots_utilizados_ruta);
  const porcentaje_ocupacion = Math.round((slots_utilizados_ruta / slots) * 100);

  return {
    slots,
    slots_utilizados_ruta,
    slots_disponibles,
    porcentaje_ocupacion,
    talla: calcularTalla(slots),
  };
}

export function advertenciasCapacidad(
  capacidad: CapacidadRuta,
  bultosAdicionales = 0,
): AdvertenciaConsolidacion[] {
  const advertencias: AdvertenciaConsolidacion[] = [];
  const proyectado = capacidad.slots_utilizados_ruta + bultosAdicionales;

  if (proyectado > capacidad.slots) {
    advertencias.push({
      tipo: 'ocupacion_excedida',
      mensaje: `Capacidad insuficiente: se requieren ${proyectado} slots y el camión tiene ${capacidad.slots}.`,
      bloqueante: true,
    });
    return advertencias;
  }

  const porcentajeProyectado = Math.round((proyectado / capacidad.slots) * 100);
  if (porcentajeProyectado < UMBRAL_OCUPACION_BAJA) {
    advertencias.push({
      tipo: 'ocupacion_baja',
      mensaje:
        'Esta ruta tiene baja ocupación. Se recomienda consolidar más carga.',
      bloqueante: false,
    });
  }

  return advertencias;
}

export function esPedidoLargo(distanciaKm: number | null): boolean {
  return (distanciaKm ?? 0) > UMBRAL_PEDIDO_LARGO_KM;
}

export function maxDistanciaEntreDestinos(pedidos: PedidoConsolidacion[]): number {
  const hayLargo = pedidos.some((p) => esPedidoLargo(p.distancia_km));
  return hayLargo
    ? MAX_DIST_DESTINOS_PEDIDO_LARGO_KM
    : MAX_DIST_DESTINOS_PEDIDO_CORTO_KM;
}

export function advertenciasDistanciaDestinos(
  pedidos: PedidoConsolidacion[],
  distanciasEntreDestinosKm: number[],
): AdvertenciaConsolidacion[] {
  if (pedidos.length < 2 || distanciasEntreDestinosKm.length === 0) {
    return [];
  }

  const maxPermitida = maxDistanciaEntreDestinos(pedidos);
  const excedida = distanciasEntreDestinosKm.find((d) => d > maxPermitida);

  if (excedida == null) {
    return [];
  }

  const tipoRuta = pedidos.some((p) => esPedidoLargo(p.distancia_km))
    ? 'largos'
    : 'cortos';

  return [
    {
      tipo: 'distancia_destinos',
      mensaje: `Distancia entre destinos (${excedida} km) supera el máximo de ${maxPermitida} km para pedidos ${tipoRuta}.`,
      bloqueante: false,
    },
  ];
}
