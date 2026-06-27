import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { RutasService } from '../rutas/rutas.service';
import { RutasPlantillaService } from '../rutas-plantilla/rutas-plantilla.service';
import { CreateRecurrenciaDto } from './dto/create-recurrencia.dto';
import {
  advanceProximaEjecucion,
  computeInitialProximaEjecucion,
  computeProximasFechas,
  type RecurrenciaScheduleParams,
} from './recurrencias-date.helper';
import type {
  ConfiguracionLogisticaSnapshot,
  RecurrenciaDto,
  RecurrenciaEjecucionDto,
  RecurrenciaEstado,
} from './recurrencias.types';

const RECURRENCIA_SELECT = `
  id,
  cliente_id,
  ruta_plantilla_id,
  ruta_origen_id,
  creado_por_usuario_id,
  creado_por_rol,
  frecuencia,
  intervalo,
  dia_semana,
  dia_mes,
  hora_ejecucion,
  zona_horaria,
  fecha_inicio,
  fecha_fin,
  proxima_ejecucion,
  ultima_ejecucion,
  estado,
  configuracion_logistica,
  created_at,
  updated_at,
  clientes(id, nombre),
  rutas_plantilla(id, nombre)
`;

@Injectable()
export class RecurrenciasService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly rutasService: RutasService,
    private readonly rutasPlantillaService: RutasPlantillaService,
  ) {}

  async create(
    dto: CreateRecurrenciaDto,
    user: AuthenticatedUser,
  ): Promise<RecurrenciaDto> {
    const clienteId = dto.cliente_id.trim();
    await this.assertClienteAccess(clienteId, user);

    const rutaPlantillaId = dto.ruta_plantilla_id?.trim() || null;
    const rutaOrigenId = dto.ruta_origen_id?.trim() || null;

    if (!rutaPlantillaId && !rutaOrigenId) {
      throw new BadRequestException(
        'Debe indicar ruta_plantilla_id o ruta_origen_id para originar la recurrencia',
      );
    }

    if (dto.frecuencia === 'semanal' && dto.dia_semana == null) {
      throw new BadRequestException('dia_semana es obligatorio para frecuencia semanal');
    }
    if (dto.frecuencia === 'mensual' && dto.dia_mes == null) {
      throw new BadRequestException('dia_mes es obligatorio para frecuencia mensual');
    }

    const configuracion = await this.buildConfiguracionLogistica({
      clienteId,
      rutaPlantillaId,
      rutaOrigenId,
    });

    const schedule = this.buildScheduleParams(dto);
    const proximaEjecucion = computeInitialProximaEjecucion(schedule);

    const creadoPorRol =
      user.role === 'CLIENTE' ? 'CLIENTE' : user.role === 'ADMIN' ? 'ADMIN' : 'OPERADOR';

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('recurrencias_pedido')
      .insert({
        cliente_id: clienteId,
        ruta_plantilla_id: rutaPlantillaId,
        ruta_origen_id: rutaOrigenId,
        creado_por_usuario_id: user.id,
        creado_por_rol: creadoPorRol,
        frecuencia: dto.frecuencia,
        intervalo: dto.intervalo ?? 1,
        dia_semana: dto.dia_semana ?? null,
        dia_mes: dto.dia_mes ?? null,
        hora_ejecucion: dto.hora_ejecucion || '08:00:00',
        zona_horaria: 'America/Santiago',
        fecha_inicio: schedule.fecha_inicio,
        fecha_fin: dto.fecha_fin?.trim() || null,
        proxima_ejecucion: proximaEjecucion.toISOString(),
        estado: 'activa',
        configuracion_logistica: configuracion,
      })
      .select(RECURRENCIA_SELECT)
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `No fue posible crear la recurrencia: ${error?.message}`,
      );
    }

    return this.mapRecurrencia(data, true);
  }

  async list(
    filters: { clienteId?: string; estado?: string; incluirProximas?: boolean },
    user: AuthenticatedUser,
  ): Promise<{ data: RecurrenciaDto[]; total: number }> {
    const supabase = this.supabaseConfig.getClient();
    let query = supabase
      .from('recurrencias_pedido')
      .select(RECURRENCIA_SELECT)
      .order('proxima_ejecucion', { ascending: true });

    if (user.role === 'CLIENTE') {
      const scoped = user.clienteId?.trim();
      if (!scoped) {
        throw new ForbiddenException('Sesión sin cliente vinculado');
      }
      query = query.eq('cliente_id', scoped);
    } else if (filters.clienteId?.trim()) {
      query = query.eq('cliente_id', filters.clienteId.trim());
    }

    if (filters.estado?.trim()) {
      query = query.eq('estado', filters.estado.trim());
    }

    const { data, error } = await query;
    if (error) {
      throw new InternalServerErrorException(
        `No fue posible listar recurrencias: ${error.message}`,
      );
    }

    const items = (data || []).map((row) =>
      this.mapRecurrencia(row, filters.incluirProximas === true),
    );

    return { data: items, total: items.length };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<RecurrenciaDto> {
    const row = await this.fetchRecurrenciaOrThrow(id);
    await this.assertClienteAccess(String(row.cliente_id), user);
    return this.mapRecurrencia(row, true);
  }

  async pausar(id: string, user: AuthenticatedUser): Promise<RecurrenciaDto> {
    return this.updateEstado(id, 'pausada', user);
  }

  async cancelar(id: string, user: AuthenticatedUser): Promise<RecurrenciaDto> {
    return this.updateEstado(id, 'cancelada', user);
  }

  async reanudar(id: string, user: AuthenticatedUser): Promise<RecurrenciaDto> {
    const row = await this.fetchRecurrenciaOrThrow(id);
    await this.assertClienteAccess(String(row.cliente_id), user);

    if (String(row.estado) !== 'pausada') {
      throw new BadRequestException('Solo se pueden reanudar recurrencias pausadas');
    }

    const schedule = this.scheduleFromRow(row);
    const proxima = computeInitialProximaEjecucion(schedule);

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('recurrencias_pedido')
      .update({
        estado: 'activa',
        proxima_ejecucion: proxima.toISOString(),
      })
      .eq('id', id)
      .select(RECURRENCIA_SELECT)
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `No fue posible reanudar la recurrencia: ${error?.message}`,
      );
    }

    return this.mapRecurrencia(data, true);
  }

  async listProximos(
    user: AuthenticatedUser,
    clienteId?: string,
    limit = 20,
  ): Promise<{ data: Array<RecurrenciaDto & { proximasFechas: string[] }> }> {
    const list = await this.list(
      {
        clienteId,
        estado: 'activa',
        incluirProximas: true,
      },
      user,
    );

    const activas = list.data
      .filter((r) => r.estado === 'activa')
      .slice(0, limit);

    return { data: activas as Array<RecurrenciaDto & { proximasFechas: string[] }> };
  }

  async listEjecuciones(
    recurrenciaId: string,
    user: AuthenticatedUser,
  ): Promise<{ data: RecurrenciaEjecucionDto[] }> {
    const row = await this.fetchRecurrenciaOrThrow(recurrenciaId);
    await this.assertClienteAccess(String(row.cliente_id), user);

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('recurrencias_ejecuciones')
      .select(
        'id, recurrencia_id, ruta_generada_id, programada_para, ejecutada_en, estado, detalle_error',
      )
      .eq('recurrencia_id', recurrenciaId)
      .order('programada_para', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener el historial: ${error.message}`,
      );
    }

    return {
      data: (data || []).map((e) => ({
        id: e.id,
        recurrenciaId: e.recurrencia_id,
        rutaGeneradaId: e.ruta_generada_id,
        programadaPara: e.programada_para,
        ejecutadaEn: e.ejecutada_en,
        estado: e.estado,
        detalleError: e.detalle_error,
      })),
    };
  }

  /** Job diario: genera pedidos para recurrencias vencidas. */
  async procesarRecurrenciasVencidas(): Promise<{
    procesadas: number;
    generadas: number;
    fallidas: number;
  }> {
    const supabase = this.supabaseConfig.getClient();
    const nowIso = new Date().toISOString();

    const { data: pendientes, error } = await supabase
      .from('recurrencias_pedido')
      .select(RECURRENCIA_SELECT)
      .eq('estado', 'activa')
      .lte('proxima_ejecucion', nowIso)
      .order('proxima_ejecucion', { ascending: true })
      .limit(50);

    if (error) {
      console.error('procesarRecurrenciasVencidas:', error.message);
      return { procesadas: 0, generadas: 0, fallidas: 0 };
    }

    let generadas = 0;
    let fallidas = 0;

    for (const row of pendientes || []) {
      try {
        const ok = await this.ejecutarRecurrencia(row);
        if (ok) generadas += 1;
        else fallidas += 1;
      } catch (e) {
        fallidas += 1;
        console.error('ejecutarRecurrencia error:', e);
      }
    }

    return {
      procesadas: (pendientes || []).length,
      generadas,
      fallidas,
    };
  }

  private async ejecutarRecurrencia(row: Record<string, unknown>): Promise<boolean> {
    const recurrenciaId = String(row.id);
    const programadaPara = String(row.proxima_ejecucion);
    const schedule = this.scheduleFromRow(row);
    const config = (row.configuracion_logistica || {}) as ConfiguracionLogisticaSnapshot;
    const supabase = this.supabaseConfig.getClient();

    if (schedule.fecha_fin) {
      const fin = new Date(`${schedule.fecha_fin}T23:59:59.999Z`);
      if (new Date(programadaPara) > fin) {
        await supabase
          .from('recurrencias_pedido')
          .update({ estado: 'cancelada' })
          .eq('id', recurrenciaId);
        return false;
      }
    }

    const fechaInicio = programadaPara.split('T')[0] || new Date().toISOString().split('T')[0];

    let rutaGeneradaId: string | null = null;
    let detalleError: string | null = null;
    let estadoEjecucion: 'generada' | 'fallida' = 'generada';

    try {
      const body: Record<string, unknown> = {
        cliente_id: String(row.cliente_id),
        origen: config.origen,
        destino: config.destino,
        fecha_inicio: fechaInicio,
        generado_automaticamente: true,
        recurrencia_id: recurrenciaId,
      };

      if (config.nombre_ruta) body.nombre_ruta = config.nombre_ruta;
      if (config.distancia_km != null) body.distancia_km = config.distancia_km;
      if (config.bultos_despachados != null) {
        body.bultos_despachados = config.bultos_despachados;
      }
      if (config.conductor_id) body.conductor_id = config.conductor_id;
      if (config.camion_id) body.camion_id = config.camion_id;
      if (config.observaciones) body.observaciones = config.observaciones;
      if (config.ruta_plantilla_id || row.ruta_plantilla_id) {
        body.ruta_plantilla_id = config.ruta_plantilla_id || row.ruta_plantilla_id;
      }
      if (config.paradas?.length) body.paradas = config.paradas;

      const created = await this.rutasService.createRoute(body as any);
      rutaGeneradaId = created?.id ? String(created.id) : null;
    } catch (e: unknown) {
      estadoEjecucion = 'fallida';
      detalleError = e instanceof Error ? e.message : String(e);
    }

    await supabase.from('recurrencias_ejecuciones').insert({
      recurrencia_id: recurrenciaId,
      ruta_generada_id: rutaGeneradaId,
      programada_para: programadaPara,
      estado: estadoEjecucion,
      detalle_error: detalleError,
    });

    const siguiente = advanceProximaEjecucion(new Date(programadaPara), schedule);

    await supabase
      .from('recurrencias_pedido')
      .update({
        ultima_ejecucion: new Date().toISOString(),
        proxima_ejecucion: siguiente.toISOString(),
      })
      .eq('id', recurrenciaId);

    return estadoEjecucion === 'generada';
  }

  private async buildConfiguracionLogistica(params: {
    clienteId: string;
    rutaPlantillaId: string | null;
    rutaOrigenId: string | null;
  }): Promise<ConfiguracionLogisticaSnapshot> {
    const supabase = this.supabaseConfig.getClient();

    if (params.rutaOrigenId) {
      const { data: ruta, error } = await supabase
        .from('rutas')
        .select(
          'id, cliente_id, origen, destino, nombre_ruta, distancia_km, bultos_despachados, conductor_id, camion_id, observaciones, ruta_plantilla_id',
        )
        .eq('id', params.rutaOrigenId)
        .single();

      if (error || !ruta) {
        throw new NotFoundException('Ruta origen no encontrada');
      }
      if (String(ruta.cliente_id) !== params.clienteId) {
        throw new BadRequestException('La ruta origen no pertenece al cliente indicado');
      }

      const { data: paradas } = await supabase
        .from('rutas_paradas')
        .select('direccion, orden, latitud, longitud, es_temporal')
        .eq('ruta_id', params.rutaOrigenId)
        .order('orden', { ascending: true });

      return {
        origen: String(ruta.origen),
        destino: String(ruta.destino),
        nombre_ruta: ruta.nombre_ruta,
        distancia_km: ruta.distancia_km,
        bultos_despachados: ruta.bultos_despachados,
        conductor_id: ruta.conductor_id,
        camion_id: ruta.camion_id,
        observaciones: ruta.observaciones,
        ruta_plantilla_id: ruta.ruta_plantilla_id,
        paradas: (paradas || []).map((p) => ({
          direccion: p.direccion,
          orden: p.orden,
          latitud: p.latitud,
          longitud: p.longitud,
          es_temporal: p.es_temporal ?? true,
        })),
      };
    }

    if (params.rutaPlantillaId) {
      const plantilla = await this.rutasPlantillaService.getById(params.rutaPlantillaId);
      if (plantilla.clienteId && plantilla.clienteId !== params.clienteId) {
        throw new BadRequestException('La plantilla no pertenece al cliente indicado');
      }

      return {
        origen: plantilla.origen,
        destino: plantilla.destino,
        nombre_ruta: plantilla.nombre,
        distancia_km: plantilla.distanciaEstimada ?? null,
        bultos_despachados: null,
        conductor_id: null,
        camion_id: null,
        observaciones: null,
        ruta_plantilla_id: plantilla.id,
        paradas: (plantilla.paradas || []).map((p) => ({
          direccion: p.direccion,
          orden: p.orden,
          latitud: p.latitud ?? null,
          longitud: p.longitud ?? null,
          es_temporal: false,
        })),
      };
    }

    throw new BadRequestException('No hay origen para construir la configuración logística');
  }

  private buildScheduleParams(dto: CreateRecurrenciaDto): RecurrenciaScheduleParams {
    const today = new Date().toISOString().split('T')[0];
    return {
      frecuencia: dto.frecuencia,
      intervalo: dto.intervalo ?? 1,
      dia_semana: dto.dia_semana ?? null,
      dia_mes: dto.dia_mes ?? null,
      hora_ejecucion: dto.hora_ejecucion || '08:00:00',
      fecha_inicio: dto.fecha_inicio?.trim() || today,
      fecha_fin: dto.fecha_fin?.trim() || null,
    };
  }

  private scheduleFromRow(row: Record<string, unknown>): RecurrenciaScheduleParams {
    return {
      frecuencia: row.frecuencia as RecurrenciaScheduleParams['frecuencia'],
      intervalo: Number(row.intervalo) || 1,
      dia_semana: row.dia_semana != null ? Number(row.dia_semana) : null,
      dia_mes: row.dia_mes != null ? Number(row.dia_mes) : null,
      hora_ejecucion: String(row.hora_ejecucion || '08:00:00'),
      fecha_inicio: String(row.fecha_inicio),
      fecha_fin: row.fecha_fin ? String(row.fecha_fin) : null,
    };
  }

  private async updateEstado(
    id: string,
    estado: RecurrenciaEstado,
    user: AuthenticatedUser,
  ): Promise<RecurrenciaDto> {
    const row = await this.fetchRecurrenciaOrThrow(id);
    await this.assertClienteAccess(String(row.cliente_id), user);

    if (String(row.estado) === 'cancelada') {
      throw new BadRequestException('La recurrencia ya está cancelada');
    }

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('recurrencias_pedido')
      .update({ estado })
      .eq('id', id)
      .select(RECURRENCIA_SELECT)
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `No fue posible actualizar la recurrencia: ${error?.message}`,
      );
    }

    return this.mapRecurrencia(data, true);
  }

  private async fetchRecurrenciaOrThrow(id: string) {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('recurrencias_pedido')
      .select(RECURRENCIA_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Recurrencia no encontrada');
    }

    return data;
  }

  private async assertClienteAccess(
    clienteId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role !== 'CLIENTE') return;

    const scoped = user.clienteId?.trim();
    if (!scoped || scoped !== clienteId.trim()) {
      throw new ForbiddenException('No tiene permiso sobre este cliente');
    }
  }

  private mapRecurrencia(
    row: Record<string, unknown>,
    incluirProximas: boolean,
  ): RecurrenciaDto {
    const clientes = this.normalizeRelation(row.clientes);
    const plantilla = this.normalizeRelation(row.rutas_plantilla);
    const schedule = this.scheduleFromRow(row);

    const dto: RecurrenciaDto = {
      id: String(row.id),
      clienteId: String(row.cliente_id),
      clienteNombre: clientes?.nombre ? String(clientes.nombre) : null,
      rutaPlantillaId: row.ruta_plantilla_id ? String(row.ruta_plantilla_id) : null,
      plantillaNombre: plantilla?.nombre ? String(plantilla.nombre) : null,
      rutaOrigenId: row.ruta_origen_id ? String(row.ruta_origen_id) : null,
      creadoPorUsuarioId: row.creado_por_usuario_id
        ? String(row.creado_por_usuario_id)
        : null,
      creadoPorRol: String(row.creado_por_rol),
      frecuencia: schedule.frecuencia,
      intervalo: schedule.intervalo,
      diaSemana: schedule.dia_semana ?? null,
      diaMes: schedule.dia_mes ?? null,
      horaEjecucion: schedule.hora_ejecucion,
      zonaHoraria: String(row.zona_horaria || 'America/Santiago'),
      fechaInicio: schedule.fecha_inicio,
      fechaFin: schedule.fecha_fin ?? null,
      proximaEjecucion: String(row.proxima_ejecucion),
      ultimaEjecucion: row.ultima_ejecucion ? String(row.ultima_ejecucion) : null,
      estado: row.estado as RecurrenciaEstado,
      configuracionLogistica: (row.configuracion_logistica ||
        {}) as ConfiguracionLogisticaSnapshot,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    if (incluirProximas && dto.estado === 'activa') {
      dto.proximasFechas = computeProximasFechas(
        {
          ...schedule,
          proxima_ejecucion: dto.proximaEjecucion,
        },
        5,
      );
    }

    return dto;
  }

  private normalizeRelation(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (Array.isArray(value)) return (value[0] as Record<string, unknown>) || null;
    return value as Record<string, unknown>;
  }
}
