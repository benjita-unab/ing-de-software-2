import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ESTADO_PAGO_OFICIAL } from '../pagos-cliente/pago-estado.constants';
import { DashboardService } from './dashboard.service';
import type {
  DashboardFinancieroResumenDto,
  DashboardFinancieroResumenFilters,
} from './dto/dashboard-financiero-resumen.dto';

type ComprobanteMontoRow = {
  monto: number | string | null;
  ruta_id?: string | null;
};

type PagoClienteRow = {
  estado: string | null;
  monto_total: number | string | null;
  monto_calculado: boolean | string | null;
};

type CostoOperativoRow = {
  costo_total: number | string | null;
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
    const today = this.todayDateOnly();
    const monthStart = `${today.slice(0, 7)}-01`;
    const margenRango = this.resolveMargenRango(filters.desde, filters.hasta, today, monthStart);

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

  private resolveMargenRango(
    desde: string | undefined,
    hasta: string | undefined,
    today: string,
    monthStart: string,
  ): { desde: string; hasta: string } {
    return {
      desde: desde ?? monthStart,
      hasta: hasta ?? today,
    };
  }

  private async sumComprobantesMonto(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: { clienteId?: string },
    desde: string,
    hasta: string,
  ): Promise<number> {
    let query: SupabaseQuery = supabase
      .from('comprobantes_pago')
      .select(
        filters.clienteId
          ? 'monto, rutas!inner(cliente_id)'
          : 'monto',
      )
      .not('fecha_pago', 'is', null)
      .gte('fecha_pago', `${desde}T00:00:00.000Z`)
      .lte('fecha_pago', `${hasta}T23:59:59.999Z`);

    if (filters.clienteId) {
      query = query.eq('rutas.cliente_id', filters.clienteId);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al agregar ingresos (comprobantes): ${error.message}`,
      );
    }

    return this.sumMontos((data ?? []) as ComprobanteMontoRow[]);
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
      const monto = this.redondearMonto(Number(row.monto_total ?? 0));
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
      montoPorCobrar: this.redondearMonto(montoPorCobrar),
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
    let query: SupabaseQuery = supabase
      .from('comprobantes_pago')
      .select(
        filters.clienteId
          ? 'monto, ruta_id, rutas!inner(cliente_id)'
          : 'monto, ruta_id',
      )
      .not('fecha_pago', 'is', null)
      .gte('fecha_pago', `${desde}T00:00:00.000Z`)
      .lte('fecha_pago', `${hasta}T23:59:59.999Z`);

    if (filters.clienteId) {
      query = query.eq('rutas.cliente_id', filters.clienteId);
    }

    const { data: comprobantes, error: compError } = await query;

    if (compError) {
      throw new InternalServerErrorException(
        `Error al calcular margen (comprobantes): ${compError.message}`,
      );
    }

    const rows = (comprobantes ?? []) as ComprobanteMontoRow[];
    const ingresos = this.sumMontos(rows);

    const rutaIds = [
      ...new Set(
        rows
          .map((r) => (r.ruta_id ? String(r.ruta_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (rutaIds.length === 0) {
      return this.redondearMonto(ingresos);
    }

    const { data: costos, error: costosError } = await supabase
      .from('costos_operativos_ruta')
      .select('costo_total')
      .in('ruta_id', rutaIds);

    if (costosError) {
      throw new InternalServerErrorException(
        `Error al calcular margen (costos operativos): ${costosError.message}`,
      );
    }

    const totalCostos = this.sumMontos(
      (costos ?? []) as CostoOperativoRow[],
      'costo_total',
    );

    return this.redondearMonto(ingresos - totalCostos);
  }

  private sumMontos(
    rows: Array<{ monto?: number | string | null; costo_total?: number | string | null }>,
    field: 'monto' | 'costo_total' = 'monto',
  ): number {
    const total = rows.reduce((sum, row) => {
      const raw = field === 'monto' ? row.monto : row.costo_total;
      const n = Number(raw ?? 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return this.redondearMonto(total);
  }

  private redondearMonto(valor: number): number {
    if (!Number.isFinite(valor)) return 0;
    return Number(valor.toFixed(2));
  }

  private todayDateOnly(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
