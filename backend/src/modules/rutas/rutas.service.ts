import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConductoresService } from '../conductores/conductores.service';

@Injectable()
export class RutasService {
  constructor(
    private supabaseConfig: SupabaseConfigService,
    private conductoresService: ConductoresService,
  ) {}

  /**
   * Asigna un conductor a una ruta después de validar su licencia
   */
  async assignDriverToRoute(
    rutaId: string,
    conductorId: string,
    camionId: string,
    userId: string, // Usuario que hace la asignación (debe ser admin/dispatcher)
    cargaRequeridaKg?: number,
  ) {
    if (!rutaId || !conductorId || !camionId) {
      throw new BadRequestException(
        'rutaId, conductorId y camionId son requeridos',
      );
    }

    const supabase = this.supabaseConfig.getClient();

    // PASO 1: Validar licencia del conductor
    const licenseValidation = await this.conductoresService.validateDriverLicense(
      conductorId,
    );

    if (!licenseValidation.isValid) {
      throw new ForbiddenException(
        `No se puede asignar ruta: ${licenseValidation.message}`,
      );
    }

    // PASO 2: Validar capacidad del camión
    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, patente, capacidad_kg, estado')
      .eq('id', camionId)
      .single();

    if (camionError || !camion) {
      throw new NotFoundException('Camión no encontrado');
    }

    if (camion.estado !== 'DISPONIBLE') {
      throw new ForbiddenException(`El camión no está disponible (estado: ${camion.estado})`);
    }

    if (cargaRequeridaKg && camion.capacidad_kg && camion.capacidad_kg < cargaRequeridaKg) {
      throw new ForbiddenException(
        `Capacidad insuficiente: requerida ${cargaRequeridaKg}kg, disponible ${camion.capacidad_kg}kg`,
      );
    }

    // PASO 3: Verificar que la ruta existe y no está asignada
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, estado, conductor_id')
      .eq('id', rutaId)
      .single();

    if (rutaError || !ruta) {
      throw new NotFoundException('Ruta no encontrada');
    }

    if (ruta.conductor_id) {
      throw new ForbiddenException('La ruta ya tiene un conductor asignado');
    }

    // PASO 4: Actualizar ruta con conductor y camión
    const { data: rutaActualizada, error: updateError } = await supabase
      .from('rutas')
      .update({
        conductor_id: conductorId,
        camion_id: camionId,
        fecha_inicio: new Date().toISOString(),
        estado: 'ASIGNADA',
      })
      .eq('id', rutaId)
      .select();

    if (updateError) {
      throw new BadRequestException(`Error al actualizar ruta: ${updateError.message}`);
    }

    // PASO 5: Registrar en historial
    await supabase.from('historial_estados').insert([
      {
        ruta_id: rutaId,
        estado: 'ASIGNADA',
        created_at: new Date().toISOString(),
      },
    ]);

    return {
      success: true,
      message: 'Conductor asignado a la ruta exitosamente',
      data: {
        rutaId,
        conductorId,
        camionId,
        estado: 'ASIGNADA',
      },
    };
  }

  /**
   * Obtiene rutas sin asignar
   */
  async getUnassignedRoutes() {
    const supabase = this.supabaseConfig.getClient();

    const { data: rutas, error } = await supabase
      .from('rutas')
      .select(`
        id,
        origen,
        destino,
        estado,
        created_at,
        cliente_id,
        clientes(nombre)
      `)
      .is('conductor_id', null)
      .eq('estado', 'PENDIENTE')
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Error al obtener rutas: ${error.message}`);
    }

    return rutas || [];
  }

  /**
   * Obtiene información detallada de una ruta
   */
  async getRouteInfo(rutaId: string) {
    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error } = await supabase
      .from('rutas')
      .select(`
        id,
        origen,
        destino,
        estado,
        fecha_inicio,
        fecha_fin,
        eta,
        created_at,
        cliente_id,
        conductor_id,
        camion_id,
        clientes(id, nombre),
        conductores(id, rut, licencia_vencimiento),
        camiones(id, patente, capacidad_kg)
      `)
      .eq('id', rutaId)
      .single();

    if (error) {
      throw new NotFoundException(`Ruta no encontrada: ${error.message}`);
    }

    return {
      ...ruta,
      licenseStatus: ruta.conductor_id
        ? await this.conductoresService.validateDriverLicense(ruta.conductor_id)
        : null,
    };
  }

  /**
   * Cambia el estado de una ruta
   */
  async updateRouteStatus(rutaId: string, nuevoEstado: string) {
    if (!rutaId || !nuevoEstado) {
      throw new BadRequestException('rutaId y nuevoEstado son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    // Estados válidos
    const estadosValidos = ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'ENTREGADA', 'CANCELADA'];

    if (!estadosValidos.includes(nuevoEstado)) {
      throw new BadRequestException(`Estado inválido. Acepta: ${estadosValidos.join(', ')}`);
    }

    const { data: rutaActualizada, error } = await supabase
      .from('rutas')
      .update({
        estado: nuevoEstado,
        fecha_fin: nuevoEstado === 'ENTREGADA' ? new Date().toISOString() : null,
      })
      .eq('id', rutaId)
      .select();

    if (error) {
      throw new BadRequestException(`Error al actualizar ruta: ${error.message}`);
    }

    // Registrar en historial
    await supabase.from('historial_estados').insert([
      {
        ruta_id: rutaId,
        estado: nuevoEstado,
        created_at: new Date().toISOString(),
      },
    ]);

    return {
      success: true,
      message: `Ruta actualizada a estado: ${nuevoEstado}`,
      data: rutaActualizada[0],
    };
  }

  /**
   * Lista todas las rutas con filtros opcionales
   */
  async listRoutes(filters?: {
    estado?: string;
    conductorId?: string;
    clienteId?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase.from('rutas').select(`
      id,
      origen,
      destino,
      estado,
      fecha_inicio,
      fecha_fin,
      clientes(nombre),
      conductores(rut),
      camiones(patente)
    `);

    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    if (filters?.conductorId) {
      query = query.eq('conductor_id', filters.conductorId);
    }

    if (filters?.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }

    const { data: rutas, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Error al obtener rutas: ${error.message}`);
    }

    return rutas || [];
  }
}
