import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

/** Coincide con `estado_ruta` excluyendo cierres (NOT IN ENTREGADO, CANCELADO). */
const ESTADOS_RUTA_ACTIVA = [
  'PENDIENTE',
  'ASIGNADO',
  'EN_CAMINO_ORIGEN',
  'EN_CARGA',
  'EN_TRANSITO',
  'EN_DESTINO',
] as const;

const ESTADOS_RUTA_VALIDOS = [
  ...ESTADOS_RUTA_ACTIVA,
  'ENTREGADO',
  'CANCELADO',
] as const;

export type DashboardResumen = {
  rutasActivas: number;
  rutasCompletadas: number;
  rutasPendientes: number;
  rutasConAlertas: number;
  rutasAtrasadas: number;
  sla: number;
  anomaliasPrioritarias: number;
};

export type DashboardResumenFilters = {
  clienteId?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

export type RutasPorEstadoItem = {
  estado: string;
  cantidad: number;
};

export type EntregasPorDiaItem = {
  fecha: string;
  cantidad: number;
};

export type DashboardGraficos = {
  rutasPorEstado: RutasPorEstadoItem[];
  entregasPorDia: EntregasPorDiaItem[];
};

/** Estados expuestos en el gráfico de distribución (HU-28 #246). */
const ESTADOS_GRAFICO_RUTAS = [
  'PENDIENTE',
  'ASIGNADO',
  'EN_TRANSITO',
  'ENTREGADO',
  'CANCELADO',
] as const;

/** Estados operativos en tránsito agrupados bajo EN_TRANSITO. */
const ESTADOS_EN_TRANSITO = [
  'EN_CAMINO_ORIGEN',
  'EN_CARGA',
  'EN_TRANSITO',
  'EN_DESTINO',
] as const;

type RutaPlazoRow = {
  fecha_estimada_fin: string | null;
  fecha_estimada_entrega: string | null;
  eta: string | null;
};

type EntregaSlaRow = {
  fecha_entrega_real: string | null;
  rutas: RutaPlazoRow | RutaPlazoRow[] | null;
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  parseResumenFilters(raw: DashboardResumenFilters = {}): DashboardResumenFilters {
    const clienteId = raw.clienteId?.trim() || undefined;

    const estadoRaw = raw.estado?.trim().toUpperCase() || undefined;
    if (
      estadoRaw &&
      !(ESTADOS_RUTA_VALIDOS as readonly string[]).includes(estadoRaw)
    ) {
      throw new BadRequestException(
        `Estado inválido. Valores permitidos: ${ESTADOS_RUTA_VALIDOS.join(', ')}`,
      );
    }

    const desde = DashboardService.parseDateOnly(raw.desde);
    const hasta = DashboardService.parseDateOnly(raw.hasta);

    if (raw.desde?.trim() && !desde) {
      throw new BadRequestException(
        'Parámetro desde inválido. Use formato YYYY-MM-DD.',
      );
    }
    if (raw.hasta?.trim() && !hasta) {
      throw new BadRequestException(
        'Parámetro hasta inválido. Use formato YYYY-MM-DD.',
      );
    }
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException('desde no puede ser posterior a hasta.');
    }

    return {
      clienteId,
      estado: estadoRaw,
      desde: desde ?? undefined,
      hasta: hasta ?? undefined,
    };
  }

  async getResumen(
    rawFilters: DashboardResumenFilters = {},
  ): Promise<DashboardResumen> {
    const filters = this.parseResumenFilters(rawFilters);
    const supabase = this.supabaseConfig.getClient();

    const [
      rutasActivas,
      rutasCompletadas,
      rutasPendientes,
      rutasConAlertas,
      rutasAtrasadas,
      sla,
      anomaliasPrioritarias,
    ] = await Promise.all([
      this.countRutasActivas(supabase, filters),
      this.countRutasByEstado(supabase, 'ENTREGADO', filters),
      this.countRutasByEstado(supabase, 'PENDIENTE', filters),
      this.countRutasConAlertas(supabase, filters),
      this.countRutasAtrasadas(supabase, filters),
      this.calcularSla(supabase, filters),
      this.countAnomaliasPrioritarias(supabase, filters),
    ]);

    return {
      rutasActivas,
      rutasCompletadas,
      rutasPendientes,
      rutasConAlertas,
      rutasAtrasadas,
      sla,
      anomaliasPrioritarias,
    };
  }

  async getGraficos(): Promise<DashboardGraficos> {
    const supabase = this.supabaseConfig.getClient();

    const [rutasPorEstado, entregasPorDia] = await Promise.all([
      this.buildRutasPorEstado(supabase),
      this.buildEntregasPorDia(supabase),
    ]);

    return { rutasPorEstado, entregasPorDia };
  }

  private applyRutaTableFilters(
    query: SupabaseQuery,
    filters: DashboardResumenFilters,
    opts?: { skipEstado?: boolean },
  ): SupabaseQuery {
    let next = query;

    if (filters.clienteId) {
      next = next.eq('cliente_id', filters.clienteId);
    }
    if (filters.estado && !opts?.skipEstado) {
      next = next.eq('estado', filters.estado);
    }
    if (filters.desde) {
      next = next.gte('created_at', `${filters.desde}T00:00:00.000Z`);
    }
    if (filters.hasta) {
      next = next.lte('created_at', `${filters.hasta}T23:59:59.999Z`);
    }

    return next;
  }

  private applyRutaJoinFilters(
    query: SupabaseQuery,
    filters: DashboardResumenFilters,
    prefix = 'rutas',
  ): SupabaseQuery {
    let next = query;

    if (filters.clienteId) {
      next = next.eq(`${prefix}.cliente_id`, filters.clienteId);
    }
    if (filters.estado) {
      next = next.eq(`${prefix}.estado`, filters.estado);
    }
    if (filters.desde) {
      next = next.gte(`${prefix}.created_at`, `${filters.desde}T00:00:00.000Z`);
    }
    if (filters.hasta) {
      next = next.lte(`${prefix}.created_at`, `${filters.hasta}T23:59:59.999Z`);
    }

    return next;
  }

  private async buildRutasPorEstado(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
  ): Promise<RutasPorEstadoItem[]> {
    const { data, error } = await supabase.from('rutas').select('estado');

    if (error) {
      throw new InternalServerErrorException(
        `Error al obtener distribución de rutas: ${error.message}`,
      );
    }

    const conteo = new Map<string, number>(
      ESTADOS_GRAFICO_RUTAS.map((estado) => [estado, 0]),
    );

    for (const row of data ?? []) {
      const agrupado = DashboardService.mapEstadoGrafico(row.estado);
      if (!agrupado) continue;
      conteo.set(agrupado, (conteo.get(agrupado) ?? 0) + 1);
    }

    return ESTADOS_GRAFICO_RUTAS.map((estado) => ({
      estado,
      cantidad: conteo.get(estado) ?? 0,
    }));
  }

  private static mapEstadoGrafico(
    estado: string | null | undefined,
  ): (typeof ESTADOS_GRAFICO_RUTAS)[number] | null {
    if (!estado) return null;
    const upper = String(estado).trim().toUpperCase();
    if (
      ESTADOS_GRAFICO_RUTAS.includes(
        upper as (typeof ESTADOS_GRAFICO_RUTAS)[number],
      )
    ) {
      return upper as (typeof ESTADOS_GRAFICO_RUTAS)[number];
    }
    if ((ESTADOS_EN_TRANSITO as readonly string[]).includes(upper)) {
      return 'EN_TRANSITO';
    }
    return null;
  }

  private async buildEntregasPorDia(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
  ): Promise<EntregasPorDiaItem[]> {
    const dias = DashboardService.lastNDays(7);
    const desde = dias[0];

    const { data, error } = await supabase
      .from('entregas')
      .select('fecha_entrega_real')
      .gte('fecha_entrega_real', `${desde}T00:00:00.000Z`)
      .not('fecha_entrega_real', 'is', null);

    if (error) {
      throw new InternalServerErrorException(
        `Error al obtener entregas por día: ${error.message}`,
      );
    }

    const conteo = new Map<string, number>(dias.map((fecha) => [fecha, 0]));

    for (const row of data ?? []) {
      const fecha = DashboardService.toDateOnly(
        String(row.fecha_entrega_real ?? ''),
      );
      if (!fecha || !conteo.has(fecha)) continue;
      conteo.set(fecha, (conteo.get(fecha) ?? 0) + 1);
    }

    return dias.map((fecha) => ({
      fecha,
      cantidad: conteo.get(fecha) ?? 0,
    }));
  }

  private static lastNDays(n: number): string[] {
    const dias: string[] = [];
    const hoy = new Date();
    for (let i = n - 1; i >= 0; i -= 1) {
      const d = new Date(hoy);
      d.setUTCDate(hoy.getUTCDate() - i);
      dias.push(d.toISOString().slice(0, 10));
    }
    return dias;
  }

  private async countRutasActivas(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    let query = supabase
      .from('rutas')
      .select('*', { count: 'exact', head: true })
      .in('estado', [...ESTADOS_RUTA_ACTIVA]);

    query = this.applyRutaTableFilters(query, filters);

    const { count, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas activas: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  private async countRutasByEstado(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    kpiEstado: string,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    if (filters.estado && filters.estado !== kpiEstado) {
      return 0;
    }

    let query = supabase
      .from('rutas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', kpiEstado);

    query = this.applyRutaTableFilters(query, filters, { skipEstado: true });

    const { count, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas (${kpiEstado}): ${error.message}`,
      );
    }

    return count ?? 0;
  }

  /** Rutas con emergencia activa (mensajes_conductor: ALTA sin confirmar). */
  private async countRutasConAlertas(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    let query = supabase
      .from('mensajes_conductor')
      .select('ruta_id, rutas!inner(id, cliente_id, estado, created_at)')
      .eq('prioridad', 'ALTA')
      .eq('acknowledged', false)
      .not('ruta_id', 'is', null);

    query = this.applyRutaJoinFilters(query, filters);

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas con alertas: ${error.message}`,
      );
    }

    const rutasUnicas = new Set(
      (data ?? [])
        .map((row) => row.ruta_id)
        .filter((id): id is string => Boolean(id)),
    );

    return rutasUnicas.size;
  }

  private async countRutasAtrasadas(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    let query = supabase
      .from('rutas')
      .select('fecha_estimada_fin, fecha_estimada_entrega, eta')
      .in('estado', [...ESTADOS_RUTA_ACTIVA]);

    query = this.applyRutaTableFilters(query, filters);

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas atrasadas: ${error.message}`,
      );
    }

    const hoy = DashboardService.todayDateOnly();

    return (data ?? []).filter((ruta) => {
      const plazo = DashboardService.resolvePlazoSlaDate(ruta);
      return plazo != null && plazo < hoy;
    }).length;
  }

  private async calcularSla(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    if (filters.estado && filters.estado !== 'ENTREGADO') {
      return 0;
    }

    let query = supabase
      .from('entregas')
      .select(
        `
        fecha_entrega_real,
        rutas!inner (
          estado,
          cliente_id,
          created_at,
          fecha_estimada_fin,
          fecha_estimada_entrega,
          eta
        )
      `,
      )
      .eq('rutas.estado', 'ENTREGADO')
      .not('fecha_entrega_real', 'is', null);

    query = this.applyRutaJoinFilters(query, filters);

    if (filters.desde) {
      query = query.gte(
        'fecha_entrega_real',
        `${filters.desde}T00:00:00.000Z`,
      );
    }
    if (filters.hasta) {
      query = query.lte(
        'fecha_entrega_real',
        `${filters.hasta}T23:59:59.999Z`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al calcular SLA: ${error.message}`,
      );
    }

    let aTiempo = 0;
    let conPlazo = 0;

    for (const row of (data ?? []) as EntregaSlaRow[]) {
      const ruta = Array.isArray(row.rutas) ? row.rutas[0] : row.rutas;
      if (!ruta || !row.fecha_entrega_real) continue;

      const plazo = DashboardService.resolvePlazoSlaDate(ruta);
      if (plazo == null) continue;

      conPlazo += 1;
      const entregaDate = DashboardService.toDateOnly(row.fecha_entrega_real);
      if (entregaDate != null && entregaDate <= plazo) {
        aTiempo += 1;
      }
    }

    if (conPlazo === 0) return 0;

    return Math.round(((100 * aTiempo) / conPlazo) * 100) / 100;
  }

  private async countAnomaliasPrioritarias(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    filters: DashboardResumenFilters,
  ): Promise<number> {
    let query = supabase
      .from('anomalias')
      .select('id, rutas!inner(id, cliente_id, estado, created_at)', {
        count: 'exact',
        head: true,
      })
      .eq('es_prioritario', true);

    query = this.applyRutaJoinFilters(query, filters);

    const { count, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar anomalías prioritarias: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  /** Plazo SLA: COALESCE(fecha_estimada_fin, fecha_estimada_entrega, eta::date). */
  private static resolvePlazoSlaDate(ruta: RutaPlazoRow): string | null {
    const fin = DashboardService.parseDateOnly(ruta.fecha_estimada_fin);
    if (fin) return fin;

    const entrega = DashboardService.parseDateOnly(ruta.fecha_estimada_entrega);
    if (entrega) return entrega;

    if (ruta.eta) {
      return DashboardService.toDateOnly(ruta.eta);
    }

    return null;
  }

  private static parseDateOnly(
    value: string | null | undefined,
  ): string | null {
    if (value == null || String(value).trim() === '') return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return DashboardService.toDateOnly(s);
  }

  private static toDateOnly(value: string): string | null {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  private static todayDateOnly(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
