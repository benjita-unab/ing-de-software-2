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

    // PASO 4: Actualizar ruta con conductor y camión.
    // El enum real `estado_ruta` usa 'ASIGNADO' (masculino), no 'ASIGNADA'.
    const { data: rutaActualizada, error: updateError } = await supabase
      .from('rutas')
      .update({
        conductor_id: conductorId,
        camion_id: camionId,
        fecha_inicio: new Date().toISOString(),
        estado: 'ASIGNADO',
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
        estado: 'ASIGNADO',
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
        estado: 'ASIGNADO',
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

    // Enum real `estado_ruta` en Supabase.
    const estadosValidos = [
      'PENDIENTE',
      'ASIGNADO',
      'EN_CAMINO_ORIGEN',
      'EN_CARGA',
      'EN_TRANSITO',
      'EN_DESTINO',
      'ENTREGADO',
      'CANCELADO',
    ];

    if (!estadosValidos.includes(nuevoEstado)) {
      throw new BadRequestException(`Estado inválido. Acepta: ${estadosValidos.join(', ')}`);
    }

    const { data: rutaActualizada, error } = await supabase
      .from('rutas')
      .update({
        estado: nuevoEstado,
        fecha_fin: nuevoEstado === 'ENTREGADO' ? new Date().toISOString() : null,
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

  /**
   * Devuelve las evidencias de una ruta:
   *  - `pdfs`: comprobantes guardados en Supabase Storage,
   *    bucket `entregas`, carpeta `comprobantes/{rutaId}/...`.
   *  - `fotos`: imágenes de trazabilidad. Preferimos la tabla `fotos`
   *    (tiene `ruta_id` directo); como fallback, `traceability_events`
   *    filtrados por ventana temporal porque ese registro no tiene `ruta_id`.
   *  - `firmaUrl`: firma del cliente. Primero `entregas.firma_url` por
   *    `ruta_id`; como fallback, busca en el bucket `fotos_trazabilidad/firmas/`
   *    archivos cuyo nombre empiece con `{rutaId}-`.
   */
  async getEvidencias(rutaId: string) {
    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select('id, fecha_inicio, fecha_fin')
      .eq('id', rutaId)
      .single();

    if (rutaError || !ruta) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // ── 1) PDFs en bucket `entregas`, carpeta `comprobantes/{rutaId}/...`
    const pdfFiles = await this.supabaseConfig.listFiles(
      'entregas',
      `comprobantes/${rutaId}`,
    );

    const pdfs = pdfFiles
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .map((f) => ({
        nombre: f.name,
        url: this.supabaseConfig.getPublicUrl(
          'entregas',
          `comprobantes/${rutaId}/${f.name}`,
        ),
      }))
      .filter((p) => !!p.url);

    // ── 2) Fotos de trazabilidad
    const fotos: Array<{
      id: string;
      etapa: string | null;
      url: string;
      timestamp: string | null;
    }> = [];

    // 2a) Tabla `fotos` (vínculo directo por ruta_id)
    const { data: fotosRow } = await supabase
      .from('fotos')
      .select('id, etapa, url, created_at')
      .eq('ruta_id', rutaId)
      .order('created_at', { ascending: true });

    for (const f of fotosRow || []) {
      if (!f?.url) continue;
      fotos.push({
        id: String(f.id),
        etapa: f.etapa ?? null,
        url: f.url,
        timestamp: f.created_at ?? null,
      });
    }

    // 2b) Fallback en `traceability_events` SOLO si la tabla `fotos`
    //     no devolvió nada. Estrategia en dos pasos:
    //       1) Preferir eventos con `ruta_id = X` (fuente confiable).
    //       2) Si la columna no existe aún (pre-migración) o no hay
    //          eventos con ese ruta_id, caer al filtro por ventana
    //          temporal usando rutas.fecha_inicio/fecha_fin.
    if (fotos.length === 0) {
      let traceEvents: Array<{
        id: string | null;
        etapa: string | null;
        foto_uri: string | null;
        timestamp_evento: string | null;
      }> = [];

      // Intento por ruta_id directo. Si la columna aún no existe en BD,
      // PostgREST devuelve un error: lo capturamos y caemos al fallback.
      const exactos = await supabase
        .from('traceability_events')
        .select('id, etapa, foto_uri, timestamp_evento')
        .eq('ruta_id', rutaId)
        .order('timestamp_evento', { ascending: true });

      const colMissing =
        exactos.error &&
        ['42703', 'PGRST204'].includes(
          (exactos.error as { code?: string }).code || '',
        );

      if (!exactos.error && exactos.data && exactos.data.length > 0) {
        traceEvents = exactos.data;
      } else if (
        (colMissing || (!exactos.error && (exactos.data || []).length === 0)) &&
        ruta.fecha_inicio
      ) {
        const desde = ruta.fecha_inicio as unknown as string;
        const hasta =
          (ruta.fecha_fin as unknown as string) || new Date().toISOString();

        const fallback = await supabase
          .from('traceability_events')
          .select('id, etapa, foto_uri, timestamp_evento')
          .gte('timestamp_evento', desde)
          .lte('timestamp_evento', hasta)
          .order('timestamp_evento', { ascending: true });

        traceEvents = fallback.data || [];
      }

      for (const ev of traceEvents) {
        if (!ev?.foto_uri) continue;
        const url = this.supabaseConfig.getPublicUrl(
          'fotos_trazabilidad',
          ev.foto_uri,
        );
        if (!url) continue;
        fotos.push({
          id: String(ev.id),
          etapa: ev.etapa ?? null,
          url,
          timestamp: ev.timestamp_evento ?? null,
        });
      }
    }

    // ── 3) Firma: primero tabla `entregas`, fallback storage
    let firmaUrl: string | null = null;

    const { data: entregasRows } = await supabase
      .from('entregas')
      .select('firma_url, fecha_entrega_real, created_at')
      .eq('ruta_id', rutaId)
      .order('created_at', { ascending: false });

    for (const e of entregasRows || []) {
      const candidate = (e?.firma_url || '').toString().trim();
      // Datos legacy guardaron literalmente la cadena "null".
      if (candidate && candidate.toLowerCase() !== 'null') {
        firmaUrl = candidate;
        break;
      }
    }

    if (!firmaUrl) {
      const firmaFiles = await this.supabaseConfig.listFiles(
        'fotos_trazabilidad',
        'firmas',
      );
      const match = firmaFiles.find((f) => f.name.startsWith(`${rutaId}-`));
      if (match) {
        firmaUrl = this.supabaseConfig.getPublicUrl(
          'fotos_trazabilidad',
          `firmas/${match.name}`,
        );
      }
    }

    return {
      rutaId,
      pdfs,
      fotos,
      firmaUrl,
    };
  }
}
