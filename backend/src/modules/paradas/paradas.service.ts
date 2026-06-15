import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { calcularDistanciaVialGoogle } from '../rutas/google-routes-distance.helper';
import type { CreateParadaDto } from './dto/create-parada.dto';
import type { ReorderParadasDto } from './dto/reorder-paradas.dto';

/** Tipo de parada permitido (extensible sin breaking change) */
const TIPOS_PARADA_VALIDOS = ['ENTREGA', 'RECOLECCION', 'DESCANSO'] as const;

/**
 * HU-61 — Servicio de gestión de paradas intermedias.
 *
 * Trabaja sobre la tabla `ruta_paradas` que es ADITIVA a `rutas`.
 * La tabla `rutas` (origen, destino, distancia_km, eta) NO se modifica
 * destructivamente: solo se actualiza `distancia_km` al recalcular.
 *
 * Tareas cubiertas:
 *   #520 CRUD paradas
 *   #521 Reordenamiento
 *   #522 Persistencia (tabla ruta_paradas)
 *   #523 Recálculo distancia total
 */
@Injectable()
export class ParadasService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  private getClient() {
    return this.supabaseConfig.getClient();
  }

  private getApiKey(): string {
    return String(process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CRUD PARADAS (Task #520)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Devuelve todas las paradas de una ruta, ordenadas por `orden` ASC.
   * Zero Breaking Change: si la tabla no existe aún devuelve [] en vez de 500.
   */
  async getParadasByRuta(rutaId: string) {
    if (!rutaId) throw new BadRequestException('rutaId es requerido');

    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('ruta_paradas')
      .select(
        'id, ruta_id, orden, direccion, lat, lng, tipo_parada, estado, eta, distancia_desde_anterior_km, created_at',
      )
      .eq('ruta_id', rutaId)
      .order('orden', { ascending: true });

    if (error) {
      // Si la tabla no existe aún (migración pendiente), devolvemos [] sin romper.
      if (
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === '42P01'
      ) {
        return [];
      }
      throw new BadRequestException(`Error al obtener paradas: ${error.message}`);
    }

    return data ?? [];
  }

  /**
   * Crea una nueva parada al final del array de paradas de la ruta.
   * Si `orden` viene en el DTO, se respeta; si no, se calcula automáticamente.
   */
  async createParada(rutaId: string, body: CreateParadaDto) {
    if (!rutaId) throw new BadRequestException('rutaId es requerido');

    const direccion = String(body?.direccion ?? '').trim();
    if (!direccion) throw new BadRequestException('direccion es obligatoria');

    const tipoRaw = String(body?.tipo_parada ?? 'ENTREGA')
      .trim()
      .toUpperCase();
    if (!TIPOS_PARADA_VALIDOS.includes(tipoRaw as any)) {
      throw new BadRequestException(
        `tipo_parada inválido. Valores permitidos: ${TIPOS_PARADA_VALIDOS.join(', ')}`,
      );
    }

    const supabase = this.getClient();

    // Calcular el siguiente número de orden si no viene explícito
    let orden: number;
    if (body?.orden != null && Number.isInteger(Number(body.orden))) {
      orden = Number(body.orden);
    } else {
      const { data: existentes } = await supabase
        .from('ruta_paradas')
        .select('orden')
        .eq('ruta_id', rutaId)
        .order('orden', { ascending: false })
        .limit(1);

      orden = existentes && existentes.length > 0 ? existentes[0].orden + 1 : 1;
    }

    const insert: Record<string, unknown> = {
      ruta_id: rutaId,
      orden,
      direccion,
      tipo_parada: tipoRaw,
      estado: 'PENDIENTE',
    };

    if (body?.lat != null && Number.isFinite(Number(body.lat))) {
      insert.lat = Number(body.lat);
    }
    if (body?.lng != null && Number.isFinite(Number(body.lng))) {
      insert.lng = Number(body.lng);
    }

    const { data, error } = await supabase
      .from('ruta_paradas')
      .insert(insert)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo crear la parada: ${error.message}`,
      );
    }

    // Recalcular distancia total de la ruta tras agregar la nueva parada
    try {
      await this.recalcularDistanciaRuta(rutaId);
    } catch (e: unknown) {
      console.warn('recalcularDistanciaRuta tras crear parada:', (e as Error).message);
    }

    return data;
  }

  /**
   * Edita una parada existente (dirección, lat/lng, tipo).
   */
  async updateParada(
    rutaId: string,
    paradaId: string,
    body: Partial<CreateParadaDto>,
  ) {
    if (!rutaId || !paradaId) {
      throw new BadRequestException('rutaId y paradaId son requeridos');
    }

    const supabase = this.getClient();

    // Verificar que la parada pertenece a la ruta
    const { data: existing, error: fetchError } = await supabase
      .from('ruta_paradas')
      .select('id')
      .eq('id', paradaId)
      .eq('ruta_id', rutaId)
      .maybeSingle();

    if (fetchError) {
      throw new BadRequestException(`Error al buscar parada: ${fetchError.message}`);
    }
    if (!existing) {
      throw new NotFoundException(`Parada ${paradaId} no encontrada en ruta ${rutaId}`);
    }

    const patch: Record<string, unknown> = {};

    if (body?.direccion != null) {
      const dir = String(body.direccion).trim();
      if (!dir) throw new BadRequestException('direccion no puede estar vacía');
      patch.direccion = dir;
    }

    if (body?.lat != null && Number.isFinite(Number(body.lat))) {
      patch.lat = Number(body.lat);
    }
    if (body?.lng != null && Number.isFinite(Number(body.lng))) {
      patch.lng = Number(body.lng);
    }

    if (body?.tipo_parada != null) {
      const tipo = String(body.tipo_parada).trim().toUpperCase();
      if (!TIPOS_PARADA_VALIDOS.includes(tipo as any)) {
        throw new BadRequestException(
          `tipo_parada inválido. Valores permitidos: ${TIPOS_PARADA_VALIDOS.join(', ')}`,
        );
      }
      patch.tipo_parada = tipo;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar');
    }

    const { data, error } = await supabase
      .from('ruta_paradas')
      .update(patch)
      .eq('id', paradaId)
      .eq('ruta_id', rutaId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(`Error al actualizar parada: ${error.message}`);
    }

    // Recalcular si cambió la dirección (puede cambiar distancia)
    if (patch.direccion || patch.lat || patch.lng) {
      try {
        await this.recalcularDistanciaRuta(rutaId);
      } catch (e: unknown) {
        console.warn('recalcularDistanciaRuta tras editar parada:', (e as Error).message);
      }
    }

    return data;
  }

  /**
   * Elimina una parada y renumera las restantes para mantener consistencia.
   */
  async deleteParada(rutaId: string, paradaId: string) {
    if (!rutaId || !paradaId) {
      throw new BadRequestException('rutaId y paradaId son requeridos');
    }

    const supabase = this.getClient();

    const { data: existing, error: fetchError } = await supabase
      .from('ruta_paradas')
      .select('id, orden')
      .eq('id', paradaId)
      .eq('ruta_id', rutaId)
      .maybeSingle();

    if (fetchError) throw new BadRequestException(fetchError.message);
    if (!existing) {
      throw new NotFoundException(`Parada ${paradaId} no encontrada en ruta ${rutaId}`);
    }

    const { error: deleteError } = await supabase
      .from('ruta_paradas')
      .delete()
      .eq('id', paradaId)
      .eq('ruta_id', rutaId);

    if (deleteError) {
      throw new BadRequestException(`No se pudo eliminar la parada: ${deleteError.message}`);
    }

    // Renumerar paradas restantes para no dejar huecos en el orden
    await this.renumerarParadas(rutaId);

    // Recalcular distancia total
    try {
      await this.recalcularDistanciaRuta(rutaId);
    } catch (e: unknown) {
      console.warn('recalcularDistanciaRuta tras borrar parada:', (e as Error).message);
    }

    return { success: true, message: 'Parada eliminada correctamente' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. REORDENAMIENTO (Task #521)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Recibe el nuevo orden de paradas y los actualiza de forma transaccional.
   * Luego recalcula la distancia con el nuevo orden.
   *
   * @param rutaId  UUID de la ruta
   * @param body    Array de { id, orden } con el nuevo orden completo
   */
  async reorderParadas(rutaId: string, body: ReorderParadasDto) {
    if (!rutaId) throw new BadRequestException('rutaId es requerido');

    const paradas = body?.paradas;
    if (!Array.isArray(paradas) || paradas.length === 0) {
      throw new BadRequestException('paradas debe ser un array no vacío');
    }

    // Validar que todos los items tienen id y orden válidos
    for (const p of paradas) {
      if (!p.id || !Number.isInteger(Number(p.orden))) {
        throw new BadRequestException(
          'Cada item de paradas debe tener id (string) y orden (entero)',
        );
      }
    }

    const supabase = this.getClient();

    // Verificar que todas las paradas pertenecen a la ruta
    const { data: existentes, error: fetchErr } = await supabase
      .from('ruta_paradas')
      .select('id')
      .eq('ruta_id', rutaId);

    if (fetchErr) throw new BadRequestException(fetchErr.message);

    const idsExistentes = new Set((existentes ?? []).map((p: { id: string }) => p.id));
    for (const p of paradas) {
      if (!idsExistentes.has(p.id)) {
        throw new BadRequestException(
          `La parada ${p.id} no pertenece a la ruta ${rutaId}`,
        );
      }
    }

    // ── ESTRATEGIA 2 PASADAS para evitar violación de UNIQUE(ruta_id, orden) ──
    //
    // Problema: actualizar A(1→2) falla si B aún tiene orden=2 (constraint collision).
    // Solución:
    //   Pasada 1 → mover todas las paradas a órdenes temporales altos (10000 + i)
    //              para liberar las posiciones finales.
    //   Pasada 2 → asignar los órdenes definitivos sin colisión.

    // Pasada 1: órdenes temporales
    const erroresPasada1: string[] = [];
    for (let i = 0; i < paradas.length; i++) {
      const { error } = await supabase
        .from('ruta_paradas')
        .update({ orden: 10000 + i })
        .eq('id', paradas[i].id)
        .eq('ruta_id', rutaId);

      if (error) erroresPasada1.push(`parada ${paradas[i].id} (temp): ${error.message}`);
    }

    if (erroresPasada1.length > 0) {
      throw new BadRequestException(
        `Error al preparar reordenamiento: ${erroresPasada1.join('; ')}`,
      );
    }

    // Pasada 2: órdenes definitivos
    const errores: string[] = [];
    for (const { id, orden } of paradas) {
      const { error } = await supabase
        .from('ruta_paradas')
        .update({ orden: Number(orden) })
        .eq('id', id)
        .eq('ruta_id', rutaId);

      if (error) errores.push(`parada ${id}: ${error.message}`);
    }

    if (errores.length > 0) {
      throw new BadRequestException(
        `Error al reordenar paradas: ${errores.join('; ')}`,
      );
    }

    // Recalcular distancia con el nuevo orden
    let recalc: Awaited<ReturnType<typeof this.recalcularDistanciaRuta>> | null = null;
    try {
      recalc = await this.recalcularDistanciaRuta(rutaId);
    } catch (e: unknown) {
      console.warn('recalcularDistanciaRuta tras reordenar:', (e as Error).message);
    }

    return {
      success: true,
      message: 'Paradas reordenadas correctamente',
      recalculo: recalc,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RECÁLCULO DE DISTANCIA Y ETA (Task #523)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Recalcula la distancia total de la ruta incluyendo todas sus paradas.
   *
   * Algoritmo:
   *   distancia_total = Σ distancia(punto[i], punto[i+1])
   *   donde puntos = [ruta.origen, ...paradas_ordenadas, ruta.destino]
   *
   * Si Google Maps API no está disponible o falla, usa la distancia
   * lineal (Haversine) como fallback. Nunca lanza excepción — siempre
   * devuelve un resultado con flag `ok`.
   *
   * Actualiza:
   *   - ruta_paradas.distancia_desde_anterior_km  (para cada parada)
   *   - rutas.distancia_km                        (total acumulado)
   */
  async recalcularDistanciaRuta(rutaId: string) {
    if (!rutaId) throw new BadRequestException('rutaId es requerido');

    const supabase = this.getClient();

    // Obtener ruta (origen y destino originales — no se eliminan)
    const { data: ruta, error: rutaErr } = await supabase
      .from('rutas')
      .select('id, origen, destino')
      .eq('id', rutaId)
      .single();

    if (rutaErr || !ruta) {
      throw new NotFoundException(`Ruta ${rutaId} no encontrada`);
    }

    // Obtener paradas ordenadas
    const { data: paradaRows, error: paradaErr } = await supabase
      .from('ruta_paradas')
      .select('id, orden, direccion, lat, lng')
      .eq('ruta_id', rutaId)
      .order('orden', { ascending: true });

    if (paradaErr) {
      throw new BadRequestException(
        `Error al obtener paradas para recálculo: ${paradaErr.message}`,
      );
    }

    const paradas = paradaRows ?? [];

    // Si no hay paradas, la distancia es solo origen → destino.
    // No tocamos nada si ya está calculada (Zero Breaking Change).
    if (paradas.length === 0) {
      return {
        ok: true,
        distancia_total_km: null,
        segmentos: [],
        mensaje: 'Sin paradas intermedias; distancia ruta sin cambios.',
      };
    }

    // Construir lista de puntos: origen → paradas → destino
    type Punto = { label: string; address?: string; lat?: number; lng?: number };

    const puntos: Punto[] = [
      { label: 'origen', address: ruta.origen },
      ...paradas.map((p, i) => ({
        label: `parada_${i + 1}`,
        address: p.direccion,
        lat: p.lat ?? undefined,
        lng: p.lng ?? undefined,
        paradaId: p.id,
      })),
      { label: 'destino', address: ruta.destino },
    ];

    const apiKey = this.getApiKey();
    const segmentos: Array<{
      de: string;
      a: string;
      distancia_km: number | null;
      duracion_minutos: number | null;
      metodo: string;
    }> = [];

    let distanciaAcumuladaKm = 0;
    const distanciasPorParada: Record<string, number | null> = {};

    // Calcular distancia entre pares consecutivos de puntos
    for (let i = 0; i < puntos.length - 1; i++) {
      const origen = (puntos[i] as any).address ?? '';
      const destino = (puntos[i + 1] as any).address ?? '';

      let distKm: number | null = null;
      let durMin: number | null = null;
      let metodo = 'no_calculado';

      if (origen && destino && apiKey) {
        const result = await calcularDistanciaVialGoogle(
          origen,
          destino,
          apiKey,
        );
        if (result.ok) {
          distKm = result.distancia_km;
          durMin = result.duracion_minutos;
          metodo = 'google_routes';
        } else {
          // Fallback Haversine si tenemos coordenadas
          const pOrigen = puntos[i] as any;
          const pDestino = puntos[i + 1] as any;
          if (pOrigen.lat && pOrigen.lng && pDestino.lat && pDestino.lng) {
            distKm = haversineKm(pOrigen.lat, pOrigen.lng, pDestino.lat, pDestino.lng);
            metodo = 'haversine_fallback';
          }
        }
      } else if ((puntos[i] as any).lat && (puntos[i + 1] as any).lat) {
        const p1 = puntos[i] as any;
        const p2 = puntos[i + 1] as any;
        distKm = haversineKm(p1.lat, p1.lng, p2.lat, p2.lng);
        metodo = 'haversine_fallback';
      }

      segmentos.push({
        de: puntos[i].label,
        a: puntos[i + 1].label,
        distancia_km: distKm,
        duracion_minutos: durMin,
        metodo,
      });

      if (distKm != null) {
        distanciaAcumuladaKm += distKm;
      }

      // Guardar distancia desde anterior para cada parada (no origen ni destino)
      const puntoDestino = puntos[i + 1] as any;
      if (puntoDestino.paradaId) {
        distanciasPorParada[puntoDestino.paradaId] = distKm;
      }
    }

    // Actualizar distancia_desde_anterior_km en cada parada
    for (const [paradaId, distKm] of Object.entries(distanciasPorParada)) {
      try {
        await supabase
          .from('ruta_paradas')
          .update({ distancia_desde_anterior_km: distKm })
          .eq('id', paradaId);
      } catch (e: unknown) {
        console.warn(`Update distancia parada ${paradaId}:`, (e as Error).message);
      }
    }

    // Actualizar distancia_km total en rutas (el campo ya existe — Zero BC)
    const distanciaTotal =
      distanciaAcumuladaKm > 0
        ? Math.round(distanciaAcumuladaKm * 100) / 100
        : null;

    if (distanciaTotal != null) {
      try {
        await supabase
          .from('rutas')
          .update({ distancia_km: distanciaTotal })
          .eq('id', rutaId);
      } catch (e: unknown) {
        console.warn('Update distancia_km en rutas:', (e as Error).message);
      }
    }

    return {
      ok: true,
      distancia_total_km: distanciaTotal,
      segmentos,
      mensaje: `Distancia recalculada con ${paradas.length} parada(s) intermedias.`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  /** Renumera las paradas de una ruta de 1 a N para eliminar huecos. */
  private async renumerarParadas(rutaId: string): Promise<void> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('ruta_paradas')
      .select('id, orden')
      .eq('ruta_id', rutaId)
      .order('orden', { ascending: true });

    if (error || !data) return;

    for (let i = 0; i < data.length; i++) {
      try {
        await supabase
          .from('ruta_paradas')
          .update({ orden: i + 1 })
          .eq('id', data[i].id);
      } catch {
        // best-effort
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN UTILITARIA: Haversine (fallback sin API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la distancia en km entre dos coordenadas (línea recta).
 * Se usa como fallback cuando Google Maps API no está disponible.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
