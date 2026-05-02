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

    const patch: Record<string, unknown> = { estado: nuevoEstado };
    // Solo registrar fecha_fin al cerrar entrega; no borrar fecha_fin al
    // cambiar a otros estados (evita pérdida de auditoría).
    if (nuevoEstado === 'ENTREGADO') {
      patch.fecha_fin = new Date().toISOString();
    }

    const { data: rutaActualizada, error } = await supabase
      .from('rutas')
      .update(patch)
      .eq('id', rutaId)
      .select();

    if (error) {
      throw new BadRequestException(`Error al actualizar ruta: ${error.message}`);
    }

    // Si el despacho se marca ENTREGADO desde la web sin pasar por closeDelivery,
    // reflejar fecha de entrega en `entregas` cuando exista la fila (best effort).
    if (nuevoEstado === 'ENTREGADO') {
      try {
        await supabase
          .from('entregas')
          .update({ fecha_entrega_real: new Date().toISOString() })
          .eq('ruta_id', rutaId);
      } catch {
        /* tabla/claves pueden variar entre ambientes */
      }
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
      created_at,
      cliente_id,
      conductor_id,
      camion_id,
      clientes(id, nombre),
      conductores(id, rut),
      camiones(id, patente)
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
   * Devuelve las evidencias de una ruta para el modal Historial web:
   *  - `pdfs`: bucket `entregas/comprobantes/{rutaId}/`
   *  - `fotos`: unión en orden — tabla `fotos` por `ruta_id`, más
   *    `traceability_events` por `ruta_id`; dedupe por URL.
   *    Fallback temporal legacy solo si sigue sin fotos y existe ventana
   *    `fecha_inicio`/`fecha_fin` (marcado `fuente: fallback_temporal`).
   *  - `firmaUrl`: `entregas.firma_url` o prefijo `{rutaId}-` en Storage.
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

    // ── 2) Fotos de trazabilidad (combinadas sin duplicar URLs)
    type FuenteFoto =
      | 'fotos_tabla'
      | 'traceability_ruta'
      | 'fallback_temporal';

    const fotos: Array<{
      id: string;
      etapa: string | null;
      url: string;
      timestamp: string | null;
      fuente?: FuenteFoto;
      tipo?: string | null;
    }> = [];

    const urlsVistas = new Set<string>();

    const pushFoto = (
      id: string,
      etapa: string | null,
      url: string | null | undefined,
      timestamp: string | null,
      fuente: FuenteFoto,
      tipo?: string | null,
    ) => {
      if (!url || typeof url !== 'string') return;
      const u = url.trim();
      if (!u || urlsVistas.has(u)) return;
      urlsVistas.add(u);
      fotos.push({
        id,
        etapa,
        url: u,
        timestamp,
        fuente,
        tipo: tipo ?? null,
      });
    };

    const esFichaDespacho = (f: (typeof fotos)[number]) => {
      if (String(f.tipo || '').toUpperCase() === 'FICHA_DESPACHO') {
        return true;
      }
      return String(f.etapa || '').trim().toLowerCase() === 'ficha';
    };

    // 2a) Tabla `fotos` (prioridad por vínculo directo ruta_id)
    const { data: fotosRow } = await supabase
      .from('fotos')
      .select('id, etapa, url, created_at')
      .eq('ruta_id', rutaId)
      .order('created_at', { ascending: true });

    for (const f of fotosRow || []) {
      pushFoto(
        String(f.id),
        f.etapa ?? null,
        f.url,
        f.created_at ?? null,
        'fotos_tabla',
      );
    }

    // 2b) traceability_events por ruta_id (si existe la columna)
    const traceConTipo = await supabase
      .from('traceability_events')
      .select('id, etapa, foto_uri, timestamp_evento, tipo')
      .eq('ruta_id', rutaId)
      .order('timestamp_evento', { ascending: true });

    const errMsgTipo = (traceConTipo.error as { message?: string } | undefined)
      ?.message;
    const traceSinTipo =
      traceConTipo.error && /tipo/i.test(errMsgTipo || '')
        ? await supabase
            .from('traceability_events')
            .select('id, etapa, foto_uri, timestamp_evento')
            .eq('ruta_id', rutaId)
            .order('timestamp_evento', { ascending: true })
        : null;

    const traceRuta = traceSinTipo ?? traceConTipo;

    const errTrace =
      traceRuta.error &&
      ['42703', 'PGRST204'].includes(
        (traceRuta.error as { code?: string }).code || '',
      );

    if (!traceRuta.error && traceRuta.data) {
      for (const ev of traceRuta.data) {
        if (!ev?.foto_uri) continue;
        const url = this.supabaseConfig.getPublicUrl(
          'fotos_trazabilidad',
          ev.foto_uri,
        );
        const tipoEv =
          'tipo' in (ev as object) ? (ev as { tipo?: string | null }).tipo : null;
        pushFoto(
          String(ev.id ?? `ev-${ev.foto_uri}`),
          ev.etapa ?? null,
          url,
          ev.timestamp_evento ?? null,
          'traceability_ruta',
          tipoEv ?? null,
        );
      }
    } else if (errTrace) {
      console.warn(
        'EVIDENCIAS -> traceability_events.ruta_id no disponible en BD (columna ausente); omitiendo vínculo por ruta.',
      );
    }

    // 2c) Fallback temporal legacy (solo si sigue sin fotos desde fuentes directas).
    //    Puede acotarse mejor cuando todas las filas tengan ruta_id poblado.
    if (fotos.length === 0 && ruta.fecha_inicio) {
      const desde = ruta.fecha_inicio as unknown as string;
      const hasta =
        (ruta.fecha_fin as unknown as string) || new Date().toISOString();

      const fallback = await supabase
        .from('traceability_events')
        .select('id, etapa, foto_uri, timestamp_evento')
        .gte('timestamp_evento', desde)
        .lte('timestamp_evento', hasta)
        .order('timestamp_evento', { ascending: true });

      console.warn(
        'EVIDENCIAS -> fallback temporal legacy (sin fotos por tabla fotos ni traceability_events.ruta_id)',
      );

      for (const ev of fallback.data || []) {
        if (!ev?.foto_uri) continue;
        const url = this.supabaseConfig.getPublicUrl(
          'fotos_trazabilidad',
          ev.foto_uri,
        );
        pushFoto(
          String(ev.id ?? `legacy-${ev.foto_uri}`),
          ev.etapa ?? null,
          url,
          ev.timestamp_evento ?? null,
          'fallback_temporal',
        );
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

    const fichasDespacho = fotos.filter((f) => esFichaDespacho(f));
    const fotosEvidencia = fotos.filter((f) => !esFichaDespacho(f));

    return {
      rutaId,
      pdfs,
      fotos,
      fotosEvidencia,
      fichasDespacho,
      firmaUrl,
    };
  }
}
