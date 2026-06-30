import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ESTADO_PAGO_OFICIAL } from '../pagos-cliente/pago-estado.constants';
import {
  fetchComprobantesEnPeriodo,
  fetchCostosOperativosPorRutas,
  redondearMonto,
  resolvePeriodoRango,
  sumNumericField,
  todayDateOnly,
} from './dashboard-agregados.helpers';
import { DashboardService } from './dashboard.service';
import type {
  DashboardFinancieroResumenDto,
  DashboardFinancieroResumenFilters,
} from './dto/dashboard-financiero-resumen.dto';

type PagoClienteRow = {
  estado: string | null;
  monto_total: number | string | null;
  monto_calculado: boolean | string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

@Injectable()
export class DashboardFinancieroService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly dashboardService: DashboardService,
  ) {}

  async getResumen(
    rawFilters: DashboardFinancieroResumenFilters = {},
  ): Promise<DashboardFinancieroResumenDto> {
    const filters = this.dashboardService.parseResumenFilters(rawFilters);
    const today = todayDateOnly();
    const monthStart = `${today.slice(0, 7)}-01`;
    const margenRango = resolvePeriodoRango(filters.desde, filters.hasta, today);

    const supabase = this.supabaseConfig.getClient();

    const [
      ingresosHoy,
      ingresosMesMtd,
      pagosAgg,
      margenBrutoBasico,
    ] = await Promise.all([
      this.sumComprobantesMonto(supabase, filters, today, today),
      this.sumComprobantesMonto(supabase, filters, monthStart, today),
      this.aggregatePagosCliente(supabase, filters.clienteId),
      this.calcularMargenBruto(supabase, filters, margenRango.desde, margenRango.hasta),
    ]);

    return {
      ingresosHoy,
      ingresosMesMtd,
      montoPorCobrar: pagosAgg.montoPorCobrar,
      pagosPendientes: pagosAgg.pagosPendientes,
      pagosProcesando: pagosAgg.pagosProcesando,
      pagosCompletados: pagosAgg.pagosCompletados,
      margenBrutoBasico,
      filtros: {
        clienteId: filters.clienteId ?? null,
        desde: filters.desde ?? null,
        hasta: filters.hasta ?? null,
        margenDesde: margenRango.desde,
        margenHasta: margenRango.hasta,
      },
    };
  }

  private async sumComprobantesMonto(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: { clienteId?: string },
    desde: string,
    hasta: string,
  ): Promise<number> {
    const rows = await fetchComprobantesEnPeriodo(
      supabase,
      filters,
      desde,
      hasta,
    );
    return sumNumericField(
      rows as unknown as Array<Record<string, unknown>>,
      'monto',
    );
  }

  private async aggregatePagosCliente(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    clienteId?: string,
  ): Promise<{
    montoPorCobrar: number;
    pagosPendientes: number;
    pagosProcesando: number;
    pagosCompletados: number;
  }> {
    let query: SupabaseQuery = supabase
      .from('pagos_cliente')
      .select('estado, monto_total, monto_calculado');

    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al agregar pagos cliente: ${error.message}`,
      );
    }

    let montoPorCobrar = 0;
    let pagosPendientes = 0;
    let pagosProcesando = 0;
    let pagosCompletados = 0;

    for (const row of (data ?? []) as PagoClienteRow[]) {
      const estado = String(row.estado ?? '').trim().toUpperCase();
      const monto = redondearMonto(Number(row.monto_total ?? 0));
      const calculado =
        row.monto_calculado === true || row.monto_calculado === 'true';

      if (estado === ESTADO_PAGO_OFICIAL.PENDIENTE) {
        pagosPendientes += 1;
        if (calculado) montoPorCobrar += monto;
      } else if (estado === ESTADO_PAGO_OFICIAL.PROCESANDO) {
        pagosProcesando += 1;
        if (calculado) montoPorCobrar += monto;
      } else if (estado === ESTADO_PAGO_OFICIAL.PAGADO) {
        pagosCompletados += 1;
      }
    }

    return {
      montoPorCobrar: redondearMonto(montoPorCobrar),
      pagosPendientes,
      pagosProcesando,
      pagosCompletados,
    };
  }

  private async calcularMargenBruto(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: { clienteId?: string },
    desde: string,
    hasta: string,
  ): Promise<number> {
    const comprobantes = await fetchComprobantesEnPeriodo(
      supabase,
      filters,
      desde,
      hasta,
    );
    const ingresos = sumNumericField(
      comprobantes as unknown as Array<Record<string, unknown>>,
      'monto',
    );

    const rutaIds = [
      ...new Set(
        comprobantes
          .map((r) => (r.ruta_id ? String(r.ruta_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (rutaIds.length === 0) {
      return redondearMonto(ingresos);
    }

    const costos = await fetchCostosOperativosPorRutas(supabase, rutaIds);
    const totalCostos = sumNumericField(
      costos as unknown as Array<Record<string, unknown>>,
      'costo_total',
    );

    return redondearMonto(ingresos - totalCostos);
  }
}
