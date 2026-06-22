import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { calcularDistanciaVialGoogle } from '../rutas/google-routes-distance.helper';
import { CalcularRutaPlantillaDto } from './dto/calcular-ruta-plantilla.dto';
import { CreateRutaPlantillaDto } from './dto/create-ruta-plantilla.dto';
import { UpdateRutaPlantillaDto } from './dto/update-ruta-plantilla.dto';
import type {
  CalcularRutaPlantillaResult,
  RutaPlantillaDetalleDto,
  RutaPlantillaListItemDto,
  RutaPlantillaParadaDto,
  RutasPlantillaListResponse,
} from './rutas-plantilla.types';

const PLANTILLA_SELECT = `
  id,
  nombre,
  origen,
  destino,
  distancia_estimada,
  tiempo_estimado,
  origen_lat,
  origen_lng,
  destino_lat,
  destino_lng,
  activa,
  cliente_id,
  fecha_creacion,
  fecha_actualizacion
`;

@Injectable()
export class RutasPlantillaService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async list(
    nombre?: string,
    activa?: string,
    clienteId?: string,
  ): Promise<RutasPlantillaListResponse> {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase
      .from('rutas_plantilla')
      .select(PLANTILLA_SELECT)
      .order('nombre', { ascending: true });

    const filtroActiva = this.parseActivaFilter(activa);
    if (filtroActiva !== null) {
      query = query.eq('activa', filtroActiva);
    }

    const cliente = clienteId?.trim();
    if (cliente) {
      query = query.eq('cliente_id', cliente);
    }

    const q = nombre?.trim();
    if (q) {
      query = query.ilike('nombre', `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible listar rutas plantilla: ${error.message}`,
      );
    }

    const rows = data || [];
    const items = await Promise.all(
      rows.map(async (row) => this.mapListItem(row)),
    );

    return { data: items, total: items.length };
  }

  async getById(id: string): Promise<RutaPlantillaDetalleDto> {
    const plantilla = await this.fetchPlantillaOrThrow(id);
    const paradas = await this.fetchParadas(id);
    const cantidadPedidos = await this.countPedidosAsociados(id);

    return {
      ...this.mapListItemBase(plantilla),
      cantidadParadas: paradas.length,
      cantidadPedidos,
      paradas,
    };
  }

  /** HU-57: distancia y tiempo vial vía Google Routes (con paradas intermedias). */
  async calcularRuta(
    dto: CalcularRutaPlantillaDto,
  ): Promise<CalcularRutaPlantillaResult> {
    const origen = dto.origen.trim();
    const destino = dto.destino.trim();

    const intermediates = (dto.paradas ?? [])
      .filter((p) => p.direccion?.trim())
      .sort((a, b) => a.orden - b.orden)
      .map((p) => p.direccion.trim());

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';
    const result = await calcularDistanciaVialGoogle(
      origen,
      destino,
      apiKey,
      intermediates,
    );

    if (!result.ok) {
      throw new BadRequestException(
        'error' in result ? result.error : 'No se pudo calcular la ruta.',
      );
    }

    return {
      distanciaEstimada: result.distancia_km,
      tiempoEstimado: result.duracion_minutos,
    };
  }

  async create(dto: CreateRutaPlantillaDto): Promise<RutaPlantillaDetalleDto> {
    const supabase = this.supabaseConfig.getClient();
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from('rutas_plantilla')
      .insert({
        nombre: dto.nombre.trim(),
        origen: dto.origen.trim(),
        destino: dto.destino.trim(),
        distancia_estimada:
          dto.distanciaEstimada !== undefined ? dto.distanciaEstimada : null,
        tiempo_estimado:
          dto.tiempoEstimado !== undefined ? dto.tiempoEstimado : null,
        origen_lat: dto.origenLat ?? null,
        origen_lng: dto.origenLng ?? null,
        destino_lat: dto.destinoLat ?? null,
        destino_lng: dto.destinoLng ?? null,
        activa: dto.activa !== false,
        cliente_id: dto.clienteId?.trim() || null,
        fecha_actualizacion: now,
      })
      .select(PLANTILLA_SELECT)
      .single();

    if (error || !inserted) {
      throw new InternalServerErrorException(
        `No fue posible crear la ruta plantilla: ${error?.message}`,
      );
    }

    if (dto.paradas?.length) {
      await this.replaceParadas(inserted.id, dto.paradas);
    }

    return this.getById(inserted.id);
  }

  async update(
    id: string,
    dto: UpdateRutaPlantillaDto,
  ): Promise<RutaPlantillaDetalleDto> {
    await this.fetchPlantillaOrThrow(id);

    const updateRow: Record<string, unknown> = {
      fecha_actualizacion: new Date().toISOString(),
    };

    if (dto.nombre !== undefined) updateRow.nombre = dto.nombre.trim();
    if (dto.origen !== undefined) updateRow.origen = dto.origen.trim();
    if (dto.destino !== undefined) updateRow.destino = dto.destino.trim();
    if (dto.distanciaEstimada !== undefined) {
      updateRow.distancia_estimada = dto.distanciaEstimada;
    }
    if (dto.tiempoEstimado !== undefined) {
      updateRow.tiempo_estimado = dto.tiempoEstimado;
    }
    if (dto.origenLat !== undefined) updateRow.origen_lat = dto.origenLat;
    if (dto.origenLng !== undefined) updateRow.origen_lng = dto.origenLng;
    if (dto.destinoLat !== undefined) updateRow.destino_lat = dto.destinoLat;
    if (dto.destinoLng !== undefined) updateRow.destino_lng = dto.destinoLng;
    if (dto.activa !== undefined) updateRow.activa = dto.activa;
    if (dto.clienteId !== undefined) {
      updateRow.cliente_id = dto.clienteId?.trim() || null;
    }

    const supabase = this.supabaseConfig.getClient();

    const { error } = await supabase
      .from('rutas_plantilla')
      .update(updateRow)
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible actualizar la ruta plantilla: ${error.message}`,
      );
    }

    if (dto.paradas !== undefined) {
      await this.replaceParadas(id, dto.paradas);
    }

    return this.getById(id);
  }

  async duplicar(id: string): Promise<RutaPlantillaDetalleDto> {
    const original = await this.getById(id);
    const nombreCopia = `${original.nombre} (copia)`.slice(0, 150);

    return this.create({
      nombre: nombreCopia,
      origen: original.origen,
      destino: original.destino,
      distanciaEstimada: original.distanciaEstimada ?? undefined,
      tiempoEstimado: original.tiempoEstimado ?? undefined,
      origenLat: original.origenLat ?? undefined,
      origenLng: original.origenLng ?? undefined,
      destinoLat: original.destinoLat ?? undefined,
      destinoLng: original.destinoLng ?? undefined,
      activa: true,
      clienteId: original.clienteId ?? undefined,
      paradas: original.paradas.map((p) => ({
        direccion: p.direccion,
        orden: p.orden,
        latitud: p.latitud ?? undefined,
        longitud: p.longitud ?? undefined,
      })),
    });
  }

  /** Eliminación lógica: activa = false */
  async desactivar(id: string): Promise<RutaPlantillaDetalleDto> {
    return this.update(id, { activa: false });
  }

  private async fetchPlantillaOrThrow(id: string) {
    if (!id?.trim()) {
      throw new BadRequestException('id es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('rutas_plantilla')
      .select(PLANTILLA_SELECT)
      .eq('id', id.trim())
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        `Error al buscar ruta plantilla: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Ruta plantilla no encontrada');
    }

    return data;
  }

  private async fetchParadas(rutaId: string): Promise<RutaPlantillaParadaDto[]> {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('rutas_plantilla_paradas')
      .select('id, direccion, orden, latitud, longitud, fecha_creacion')
      .eq('ruta_id', rutaId)
      .order('orden', { ascending: true });

    if (error) {
      console.warn(`No fue posible cargar paradas de ${rutaId}: ${error.message}`);
      return [];
    }

    return (data || []).map((p) => ({
      id: p.id,
      direccion: p.direccion,
      orden: p.orden,
      latitud: p.latitud != null ? Number(p.latitud) : null,
      longitud: p.longitud != null ? Number(p.longitud) : null,
      fechaCreacion: p.fecha_creacion,
    }));
  }

  private async countParadas(rutaId: string): Promise<number> {
    const supabase = this.supabaseConfig.getClient();

    const { count, error } = await supabase
      .from('rutas_plantilla_paradas')
      .select('id', { count: 'exact', head: true })
      .eq('ruta_id', rutaId);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * HU-58: contará pedidos cuando exista tabla `pedidos` con columna `ruta_plantilla_id`.
   * Si la tabla/columna no existe aún, retorna 0 sin bloquear la operación.
   */
  private async countPedidosAsociados(rutaPlantillaId: string): Promise<number> {
    const supabase = this.supabaseConfig.getClient();

    const { count, error } = await supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('ruta_plantilla_id', rutaPlantillaId);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  private async replaceParadas(
    rutaId: string,
    paradas: {
      direccion: string;
      orden: number;
      latitud?: number;
      longitud?: number;
    }[],
  ): Promise<void> {
    const supabase = this.supabaseConfig.getClient();

    const { error: deleteError } = await supabase
      .from('rutas_plantilla_paradas')
      .delete()
      .eq('ruta_id', rutaId);

    if (deleteError) {
      throw new InternalServerErrorException(
        `No fue posible actualizar paradas: ${deleteError.message}`,
      );
    }

    if (!paradas.length) {
      return;
    }

    const ordenes = paradas.map((p) => p.orden);
    if (new Set(ordenes).size !== ordenes.length) {
      throw new BadRequestException(
        'Cada parada debe tener un orden único dentro de la ruta',
      );
    }

    const rows = paradas.map((p) => ({
      ruta_id: rutaId,
      direccion: p.direccion.trim(),
      orden: p.orden,
      latitud: p.latitud ?? null,
      longitud: p.longitud ?? null,
    }));

    const { error: insertError } = await supabase
      .from('rutas_plantilla_paradas')
      .insert(rows);

    if (insertError) {
      throw new InternalServerErrorException(
        `No fue posible guardar paradas: ${insertError.message}`,
      );
    }
  }

  private async mapListItem(row: Record<string, unknown>): Promise<RutaPlantillaListItemDto> {
    const id = String(row.id);
    const [cantidadParadas, cantidadPedidos] = await Promise.all([
      this.countParadas(id),
      this.countPedidosAsociados(id),
    ]);

    return {
      ...this.mapListItemBase(row),
      cantidadParadas,
      cantidadPedidos,
    };
  }

  private mapListItemBase(row: Record<string, unknown>): Omit<
    RutaPlantillaListItemDto,
    'cantidadParadas' | 'cantidadPedidos'
  > {
    return {
      id: String(row.id),
      nombre: String(row.nombre),
      origen: String(row.origen),
      destino: String(row.destino),
      distanciaEstimada: this.parseNumeric(row.distancia_estimada),
      tiempoEstimado:
        row.tiempo_estimado != null ? Number(row.tiempo_estimado) : null,
      origenLat: this.parseNumeric(row.origen_lat),
      origenLng: this.parseNumeric(row.origen_lng),
      destinoLat: this.parseNumeric(row.destino_lat),
      destinoLng: this.parseNumeric(row.destino_lng),
      activa: row.activa !== false,
      clienteId: row.cliente_id != null ? String(row.cliente_id) : null,
      fechaCreacion: String(row.fecha_creacion),
      fechaActualizacion: String(row.fecha_actualizacion),
    };
  }

  private parseNumeric(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private parseActivaFilter(raw?: string): boolean | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const v = String(raw).trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'activa') return true;
    if (v === 'false' || v === '0' || v === 'inactiva') return false;
    if (v === 'all' || v === 'todas') return null;
    return null;
  }
}
