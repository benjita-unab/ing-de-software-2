import { InternalServerErrorException } from '@nestjs/common';
import type { SupabaseConfigService } from '../../config/supabase.config';

export type DashboardPeriodoFilters = {
  clienteId?: string;
};

export type RutaMetaJoin = {
  cliente_id?: string | null;
  nombre_ruta?: string | null;
  origen?: string | null;
  destino?: string | null;
};

export type ComprobantePeriodoRow = {
  monto: number | string | null;
  ruta_id: string | null;
  rutas?: RutaMetaJoin | RutaMetaJoin[] | null;
};

export type CostoOperativoRutaRow = {
  ruta_id: string;
  costo_total: number | string | null;
  costo_combustible: number | string | null;
  costo_conductor: number | string | null;
  costo_peajes: number | string | null;
  costo_espera: number | string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function resolvePeriodoRango(
  desde: string | undefined,
  hasta: string | undefined,
  today: string = todayDateOnly(),
): { desde: string; hasta: string } {
  const monthStart = `${today.slice(0, 7)}-01`;
  return {
    desde: desde ?? monthStart,
    hasta: hasta ?? today,
  };
}

export function redondearMonto(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Number(valor.toFixed(2));
}

export function sumNumericField(
  rows: Array<Record<string, unknown>>,
  field: string,
): number {
  const total = rows.reduce((sum, row) => {
    const n = Number(row[field] ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  return redondearMonto(total);
}

export function unwrapRutaJoin(
  row: { rutas?: RutaMetaJoin | RutaMetaJoin[] | null },
): RutaMetaJoin | null {
  const raw = row.rutas;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export async function fetchComprobantesEnPeriodo(
  supabase: ReturnType<SupabaseConfigService['getClient']>,
  filters: DashboardPeriodoFilters,
  desde: string,
  hasta: string,
  opts?: { includeRutaMeta?: boolean },
): Promise<ComprobantePeriodoRow[]> {
  const select = filters.clienteId
    ? opts?.includeRutaMeta
      ? 'monto, ruta_id, rutas!inner(cliente_id, nombre_ruta, origen, destino)'
      : 'monto, ruta_id, rutas!inner(cliente_id)'
    : opts?.includeRutaMeta
      ? 'monto, ruta_id, rutas(nombre_ruta, origen, destino)'
      : 'monto, ruta_id';

  let query: SupabaseQuery = supabase
    .from('comprobantes_pago')
    .select(select)
    .not('fecha_pago', 'is', null)
    .gte('fecha_pago', `${desde}T00:00:00.000Z`)
    .lte('fecha_pago', `${hasta}T23:59:59.999Z`);

  if (filters.clienteId) {
    query = query.eq('rutas.cliente_id', filters.clienteId);
  }

  const { data, error } = await query;

  if (error) {
    throw new InternalServerErrorException(
      `Error al consultar comprobantes del período: ${error.message}`,
    );
  }

  return (data ?? []) as ComprobantePeriodoRow[];
}

export async function fetchCostosOperativosPorRutas(
  supabase: ReturnType<SupabaseConfigService['getClient']>,
  rutaIds: string[],
): Promise<CostoOperativoRutaRow[]> {
  if (rutaIds.length === 0) return [];

  const { data, error } = await supabase
    .from('costos_operativos_ruta')
    .select(
      'ruta_id, costo_total, costo_combustible, costo_conductor, costo_peajes, costo_espera',
    )
    .in('ruta_id', rutaIds);

  if (error) {
    throw new InternalServerErrorException(
      `Error al consultar costos operativos: ${error.message}`,
    );
  }

  return (data ?? []) as CostoOperativoRutaRow[];
}

export function agruparIngresosPorRuta(
  comprobantes: ComprobantePeriodoRow[],
): Map<string, { ingresos: number; nombreRuta: string | null }> {
  const map = new Map<string, { ingresos: number; nombreRuta: string | null }>();

  for (const row of comprobantes) {
    const rutaId = row.ruta_id ? String(row.ruta_id) : null;
    if (!rutaId) continue;

    const monto = redondearMonto(Number(row.monto ?? 0));
    const ruta = unwrapRutaJoin(row);
    const nombre =
      ruta?.nombre_ruta?.trim() ||
      [ruta?.origen, ruta?.destino].filter(Boolean).join(' → ') ||
      null;

    const prev = map.get(rutaId);
    map.set(rutaId, {
      ingresos: redondearMonto((prev?.ingresos ?? 0) + monto),
      nombreRuta: prev?.nombreRuta ?? nombre,
    });
  }

  return map;
}
