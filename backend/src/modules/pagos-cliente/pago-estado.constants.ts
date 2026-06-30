/**
 * Máquina de estados oficial — pagos_cliente.estado (fuente de verdad).
 *
 * Espejo logístico: rutas.estado_pago ← mapeo en minúsculas vía PagoEstadoOrchestrator.
 *
 * Estados oficiales (CHECK en BD):
 *   PENDIENTE → cobro no iniciado
 *   PROCESANDO → cobro en curso (Transbank u otro)
 *   PAGADO → cobro confirmado
 *
 * Transiciones permitidas:
 *
 *   PENDIENTE ──► PROCESANDO ──► PAGADO
 *        │              │
 *        │              └──► PENDIENTE  (rechazo / anulación)
 *        └────────────────────► PAGADO  (marcado manual operador)
 *
 * Transiciones prohibidas (ej.): PAGADO → PENDIENTE, PAGADO → PROCESANDO
 */
export const ESTADO_PAGO_OFICIAL = {
  PENDIENTE: 'PENDIENTE',
  PROCESANDO: 'PROCESANDO',
  PAGADO: 'PAGADO',
} as const;

export type EstadoPagoOficial =
  (typeof ESTADO_PAGO_OFICIAL)[keyof typeof ESTADO_PAGO_OFICIAL];

export const ESTADOS_PAGO_OFICIALES: EstadoPagoOficial[] = [
  ESTADO_PAGO_OFICIAL.PENDIENTE,
  ESTADO_PAGO_OFICIAL.PROCESANDO,
  ESTADO_PAGO_OFICIAL.PAGADO,
];

/** Transiciones válidas desde cada estado (no incluye permanecer en el mismo). */
export const TRANSICIONES_PERMITIDAS: Record<
  EstadoPagoOficial,
  readonly EstadoPagoOficial[]
> = {
  [ESTADO_PAGO_OFICIAL.PENDIENTE]: [
    ESTADO_PAGO_OFICIAL.PROCESANDO,
    ESTADO_PAGO_OFICIAL.PAGADO,
  ],
  [ESTADO_PAGO_OFICIAL.PROCESANDO]: [
    ESTADO_PAGO_OFICIAL.PAGADO,
    ESTADO_PAGO_OFICIAL.PENDIENTE,
  ],
  [ESTADO_PAGO_OFICIAL.PAGADO]: [],
};

export function normalizarEstadoOficial(estado: string): EstadoPagoOficial {
  const upper = String(estado || '').trim().toUpperCase();
  if (upper === ESTADO_PAGO_OFICIAL.PAGADO) return ESTADO_PAGO_OFICIAL.PAGADO;
  if (upper === ESTADO_PAGO_OFICIAL.PROCESANDO) return ESTADO_PAGO_OFICIAL.PROCESANDO;
  return ESTADO_PAGO_OFICIAL.PENDIENTE;
}

export function esTransicionPermitida(
  desde: EstadoPagoOficial,
  hacia: EstadoPagoOficial,
): boolean {
  if (desde === hacia) return true;
  return TRANSICIONES_PERMITIDAS[desde].includes(hacia);
}

/** Mapeo espejo para rutas.estado_pago (módulos logísticos). */
export function estadoOficialAEspejoRuta(estado: EstadoPagoOficial): string {
  return estado.toLowerCase();
}
