/** Forma de ruta devuelta por GET /api/rutas (sin transformar en backend). */
export type RutaListItem = {
  id: string;
  estado?: string | null;
  origen?: string | null;
  destino?: string | null;
  bultos_despachados?: number | null;
  distancia_km?: number | string | null;
  fecha_estimada_entrega?: string | null;
  clientes?:
    | { id?: string; nombre?: string | null }
    | { id?: string; nombre?: string | null }[]
    | null;
  tarifa_base_total?: number | string | null;
  costo_espera_total?: number | string | null;
  total_pagar?: number | string | null;
};

export function getClienteNombre(ruta: RutaListItem): string | null {
  const raw = ruta.clientes;
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  const nombre = row?.nombre?.trim();
  return nombre || null;
}

export function formatFechaEstimadaEntrega(
  value: string | null | undefined,
): string | null {
  if (value == null || !String(value).trim()) return null;
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  const dd = String(parsed.getUTCDate()).padStart(2, '0');
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDistanciaKm(
  value: number | string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${label} km`;
}

export function tieneBultos(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

export function etiquetaRutaAccesibilidad(ruta: RutaListItem): string {
  const cliente = getClienteNombre(ruta);
  const o = ruta.origen?.trim() || 'origen';
  const d = ruta.destino?.trim() || 'destino';
  return cliente
    ? `Ruta ${cliente}, de ${o} a ${d}`
    : `Ruta de ${o} a ${d}`;
}
