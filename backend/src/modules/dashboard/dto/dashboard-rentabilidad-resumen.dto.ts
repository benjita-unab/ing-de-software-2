import type { DashboardFinancieroResumenFilters } from './dashboard-financiero-resumen.dto';

/**
 * GET /api/dashboard/rentabilidad/resumen
 *
 * KPIs de rentabilidad agregados por período.
 *
 * Ingreso por ruta: SUM(comprobantes_pago.monto) agrupado por ruta_id.
 * Costos por ruta: costos_operativos_ruta (si no existe fila → costos 0).
 * Margen por ruta: ingresos − costo_total.
 */
export type RutaRentabilidadKpiDto = {
  rutaId: string;
  nombreRuta: string | null;
  ingresos: number;
  costos: number;
  margen: number;
};

export type DashboardRentabilidadResumenDto = {
  /** SUM(ingresos) − SUM(costo_total) en el período. */
  margenBrutoTotal: number;

  /**
   * Promedio de margen por ruta con comprobante en el período.
   * null si no hay rutas en el período.
   */
  margenPromedioPorRuta: number | null;

  /** Ruta con mayor margen en el período; null si no hay datos. */
  rutaMasRentable: RutaRentabilidadKpiDto | null;

  /** Ruta con menor margen en el período; null si no hay datos. */
  rutaMenosRentable: RutaRentabilidadKpiDto | null;

  /** SUM(costo_combustible) de costos_operativos_ruta para rutas del período. */
  costoTotalCombustible: number;

  /** SUM(costo_conductor). */
  costoTotalConductores: number;

  /** SUM(costo_peajes). */
  costoTotalPeajes: number;

  /** SUM(costo_espera). */
  costoTotalEspera: number;

  /** SUM(costo_total). */
  costoOperativoTotal: number;

  /** Cantidad de rutas distintas con comprobante en el período. */
  rutasEnPeriodo: number;

  filtros: DashboardRentabilidadFiltrosAplicadosDto;
};

export type DashboardRentabilidadFiltrosAplicadosDto = {
  clienteId: string | null;
  desde: string | null;
  hasta: string | null;
  periodoDesde: string;
  periodoHasta: string;
};

export type DashboardRentabilidadResumenFilters =
  DashboardFinancieroResumenFilters;
