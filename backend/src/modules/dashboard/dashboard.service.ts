import {
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

export type DashboardResumen = {
  rutasActivas: number;
  rutasCompletadas: number;
  rutasPendientes: number;
  rutasConAlertas: number;
  rutasAtrasadas: number;
  sla: number;
  anomaliasPrioritarias: number;
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

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async getResumen(): Promise<DashboardResumen> {
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
      this.countRutasActivas(supabase),
      this.countRutasByEstado(supabase, 'ENTREGADO'),
      this.countRutasByEstado(supabase, 'PENDIENTE'),
      this.countRutasConAlertas(supabase),
      this.countRutasAtrasadas(supabase),
      this.calcularSla(supabase),
      this.countAnomaliasPrioritarias(supabase),
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
    if (ESTADOS_GRAFICO_RUTAS.includes(upper as (typeof ESTADOS_GRAFICO_RUTAS)[number])) {
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
      const fecha = DashboardService.toDateOnly(String(row.fecha_entrega_real ?? ''));
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
  ): Promise<number> {
    const { count, error } = await supabase
      .from('rutas')
      .select('*', { count: 'exact', head: true })
      .in('estado', [...ESTADOS_RUTA_ACTIVA]);

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas activas: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  private async countRutasByEstado(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    estado: string,
  ): Promise<number> {
    const { count, error } = await supabase
      .from('rutas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', estado);

    if (error) {
      throw new InternalServerErrorException(
        `Error al contar rutas (${estado}): ${error.message}`,
      );
    }

    return count ?? 0;
  }

  private async countRutasConAlertas(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
  ): Promise<number> {
    const { data, error } = await supabase
      .from('incidencias')
      .select('ruta_id')
      .in('tipo', ['ALERTA', 'EMERGENCIA'])
      .not('ruta_id', 'is', null);

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
  ): Promise<number> {
    const { data, error } = await supabase
      .from('rutas')
      .select('fecha_estimada_fin, fecha_estimada_entrega, eta')
      .in('estado', [...ESTADOS_RUTA_ACTIVA]);

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
  ): Promise<number> {
    const { data, error } = await supabase
      .from('entregas')
      .select(
        `
        fecha_entrega_real,
        rutas!inner (
          estado,
          fecha_estimada_fin,
          fecha_estimada_entrega,
          eta
        )
      `,
      )
      .eq('rutas.estado', 'ENTREGADO')
      .not('fecha_entrega_real', 'is', null);

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

    return Math.round((100 * aTiempo) / conPlazo * 100) / 100;
  }

  private async countAnomaliasPrioritarias(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
  ): Promise<number> {
    const { count, error } = await supabase
      .from('anomalias')
      .select('*', { count: 'exact', head: true })
      .eq('es_prioritario', true);

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

  private static parseDateOnly(value: string | null | undefined): string | null {
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
