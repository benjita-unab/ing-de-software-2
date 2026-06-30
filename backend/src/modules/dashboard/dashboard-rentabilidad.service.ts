import { Injectable } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import {
  agruparIngresosPorRuta,
  fetchComprobantesEnPeriodo,
  fetchCostosOperativosPorRutas,
  redondearMonto,
  resolvePeriodoRango,
  sumNumericField,
  todayDateOnly,
} from './dashboard-agregados.helpers';
import { DashboardService } from './dashboard.service';
import type {
  DashboardRentabilidadResumenDto,
  DashboardRentabilidadResumenFilters,
  RutaRentabilidadKpiDto,
} from './dto/dashboard-rentabilidad-resumen.dto';

@Injectable()
export class DashboardRentabilidadService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly dashboardService: DashboardService,
  ) {}

  async getResumen(
    rawFilters: DashboardRentabilidadResumenFilters = {},
  ): Promise<DashboardRentabilidadResumenDto> {
    const filters = this.dashboardService.parseResumenFilters(rawFilters);
    const today = todayDateOnly();
    const periodo = resolvePeriodoRango(filters.desde, filters.hasta, today);

    const supabase = this.supabaseConfig.getClient();

    const comprobantes = await fetchComprobantesEnPeriodo(
      supabase,
      { clienteId: filters.clienteId },
      periodo.desde,
      periodo.hasta,
      { includeRutaMeta: true },
    );

    const ingresosPorRuta = agruparIngresosPorRuta(comprobantes);
    const rutaIds = [...ingresosPorRuta.keys()];

    const costosRows = await fetchCostosOperativosPorRutas(supabase, rutaIds);
    const costosPorRuta = new Map(
      costosRows.map((row) => [String(row.ruta_id), row]),
    );

    const margenesPorRuta: RutaRentabilidadKpiDto[] = [];
    let totalIngresos = 0;

    for (const [rutaId, { ingresos, nombreRuta }] of ingresosPorRuta) {
      const costoRow = costosPorRuta.get(rutaId);
      const costos = redondearMonto(Number(costoRow?.costo_total ?? 0));
      const margen = redondearMonto(ingresos - costos);
      totalIngresos = redondearMonto(totalIngresos + ingresos);
      margenesPorRuta.push({
        rutaId,
        nombreRuta,
        ingresos,
        costos,
        margen,
      });
    }

    const costoTotalCombustible = sumNumericField(
      costosRows as unknown as Array<Record<string, unknown>>,
      'costo_combustible',
    );
    const costoTotalConductores = sumNumericField(
      costosRows as unknown as Array<Record<string, unknown>>,
      'costo_conductor',
    );
    const costoTotalPeajes = sumNumericField(
      costosRows as unknown as Array<Record<string, unknown>>,
      'costo_peajes',
    );
    const costoTotalEspera = sumNumericField(
      costosRows as unknown as Array<Record<string, unknown>>,
      'costo_espera',
    );
    const costoOperativoTotal = sumNumericField(
      costosRows as unknown as Array<Record<string, unknown>>,
      'costo_total',
    );

    const margenBrutoTotal = redondearMonto(totalIngresos - costoOperativoTotal);
    const rutasEnPeriodo = margenesPorRuta.length;

    const ordenadas = [...margenesPorRuta].sort((a, b) => b.margen - a.margen);

    return {
      margenBrutoTotal,
      margenPromedioPorRuta:
        rutasEnPeriodo > 0
          ? redondearMonto(margenBrutoTotal / rutasEnPeriodo)
          : null,
      rutaMasRentable: ordenadas[0] ?? null,
      rutaMenosRentable:
        ordenadas.length > 0 ? ordenadas[ordenadas.length - 1] : null,
      costoTotalCombustible,
      costoTotalConductores,
      costoTotalPeajes,
      costoTotalEspera,
      costoOperativoTotal,
      rutasEnPeriodo,
      filtros: {
        clienteId: filters.clienteId ?? null,
        desde: filters.desde ?? null,
        hasta: filters.hasta ?? null,
        periodoDesde: periodo.desde,
        periodoHasta: periodo.hasta,
      },
    };
  }
}
