import type { DashboardResumenFilters } from '../dashboard.service';

/**
 * GET /api/dashboard/financiero/resumen
 *
 * KPIs financieros agregados para operador/administrador.
 *
 * Fuentes de datos:
 *   - Ingresos cobrados → comprobantes_pago.monto (fecha_pago)
 *   - Cartera y conteos   → pagos_cliente (estado, monto_calculado)
 *   - Margen bruto básico → comprobantes_pago − costos_operativos_ruta.costo_total
 */
export type DashboardFinancieroResumenDto = {
  /** Suma de comprobantes_pago.monto con fecha_pago en el día calendario actual (UTC). */
  ingresosHoy: number;

  /** Suma de comprobantes_pago.monto desde el 1.º del mes actual hasta hoy (UTC). */
  ingresosMesMtd: number;

  /**
   * SUM(pagos_cliente.monto_total) donde estado ∈ {PENDIENTE, PROCESANDO}
   * y monto_calculado = true. Snapshot actual (no filtrado por fecha).
   */
  montoPorCobrar: number;

  /** COUNT pagos_cliente con estado PENDIENTE. */
  pagosPendientes: number;

  /** COUNT pagos_cliente con estado PROCESANDO. */
  pagosProcesando: number;

  /** COUNT pagos_cliente con estado PAGADO. */
  pagosCompletados: number;

  /**
   * SUM(comprobantes en período de margen) − SUM(costo_total) de costos_operativos_ruta
   * para las rutas con comprobante en ese período.
   * Período de margen: query desde/hasta, o mes actual (MTD) si no se indican.
   */
  margenBrutoBasico: number;

  filtros: DashboardFinancieroFiltrosAplicadosDto;
};

export type DashboardFinancieroFiltrosAplicadosDto = {
  clienteId: string | null;
  desde: string | null;
  hasta: string | null;
  /** Rango usado para calcular margenBrutoBasico. */
  margenDesde: string;
  margenHasta: string;
};

export type DashboardFinancieroResumenFilters = Pick<
  DashboardResumenFilters,
  'clienteId' | 'desde' | 'hasta'
>;
