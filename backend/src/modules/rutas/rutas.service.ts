import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConductoresService } from '../conductores/conductores.service';
import { EmailService } from '../email/email.service';
import { calcularDistanciaVialGoogle } from './google-routes-distance.helper';
import { CreateAnomaliaDto } from './dto/create-anomalia.dto';

export type BultoInputDto = {
  alto_cm: number;
  ancho_cm: number;
  largo_cm: number;
  peso_kg: number;
};

/** Cuerpo esperado por POST /api/rutas (validación en createRoute). */
export type CreateRutaDto = {
  cliente_id: string;
  conductor_id?: string | null;
  camion_id?: string | null;
  nombre_ruta?: string | null;
  origen: string;
  destino: string;
  estado?: string | null;
  fecha_inicio?: string | null;
  eta?: string | null;
  distancia_km?: number | string | null;
  fecha_estimada_inicio?: string | null;
  fecha_estimada_fin?: string | null;
  fecha_estimada_entrega?: string | null;
  bultos_despachados?: number | string | null;
  bultos_detalle?: BultoInputDto[];
  costo_tac_peajes_clp?: number | string | null;
  pago_conductor_base_clp?: number | string | null;
  is_tarifa_manual?: boolean | null;
  tarifa_base_total?: number | string | null;
};

/** POST /api/rutas/estimar-fechas (HU-24). */
export type EstimarFechasDto = {
  origen?: string | null;
  destino?: string | null;
  distancia_km?: number | string | null;
  fecha_referencia?: string | null;
  fecha_inicio?: string | null;
};

export type EstimarFechasResult = {
  ok: boolean;
  distancia_km?: number;
  distancia_origen?: 'manual' | 'google_routes';
  duracion_minutos?: number | null;
  fecha_referencia?: string;
  fecha_estimada_inicio?: string;
  fecha_estimada_fin?: string;
  fecha_estimada_entrega?: string;
  advertencia?: string;
};

export type RouteTrackingPointDto = {
  latitud: number;
  longitud: number;
  timestamp_evento: string | null;
};

export type RouteTrackingDto = {
  ubicacion_actual: RouteTrackingPointDto | null;
  historial: RouteTrackingPointDto[];
};

const TRACEABILITY_RUTA_ID_MISSING_CODES = new Set(['42703', 'PGRST204']);

const ADVERTENCIA_DISTANCIA_VIAL =
  'No se pudo calcular la distancia vial automáticamente. Ingrese la distancia manualmente o revise origen/destino.';

@Injectable()
export class RutasService {
  /** Coincide con el enum `estado_ruta` en Supabase (ver también updateRouteStatus). */
  static readonly ESTADOS_RUTA = [
    'PENDIENTE',
    'ASIGNADO',
    'EN_CAMINO_ORIGEN',
    'EN_CARGA',
    'EN_TRANSITO',
    'EN_DESTINO',
    'ENTREGADO',
    'CANCELADO',
  ] as const;

  constructor(
    private supabaseConfig: SupabaseConfigService,
    private conductoresService: ConductoresService,
    private emailService: EmailService,
  ) {}

  private static readonly FECHAS_ESTIMADAS_SELECT = `
    fecha_estimada_inicio,
    fecha_estimada_fin,
    fecha_estimada_entrega,
    notificacion_fecha_estimada_enviada_at,
    notificacion_fecha_estimada_destinatario
  `;

  private parseDateOnly(value: unknown): string | null {
    if (value == null || String(value).trim() === '') return null;
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  private formatDateCl(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  private validarRangoFechasEstimadas(
    inicio: string,
    fin: string,
    entrega: string,
  ): void {
    if (inicio > fin) {
      throw new BadRequestException(
        'fecha_estimada_inicio no puede ser posterior a fecha_estimada_fin',
      );
    }
    if (entrega < inicio || entrega > fin) {
      throw new BadRequestException(
        'El día estimado debe estar entre la fecha de inicio y la fecha de fin del rango.',
      );
    }
  }

  private parseNumeroOpcional(value: unknown): number | null {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private parseDistanciaKm(value: unknown): number | null {
    const n = this.parseNumeroOpcional(value);
    if (n == null || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  private addDaysDateOnly(isoDate: string, days: number): string {
    const [y, m, d] = isoDate.split('-').map((x) => Number(x));
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  /** fecha_inicio del formulario/ruta; si no, fecha_referencia; si no, hoy. */
  private resolveFechaReferencia(body: {
    fecha_inicio?: string | null;
    fecha_referencia?: string | null;
  }): string {
    const desdeInicio =
      body.fecha_inicio != null && String(body.fecha_inicio).trim() !== ''
        ? this.parseDateOnly(body.fecha_inicio)
        : null;
    if (desdeInicio) return desdeInicio;

    const explicita =
      body.fecha_referencia != null &&
      String(body.fecha_referencia).trim() !== ''
        ? this.parseDateOnly(body.fecha_referencia)
        : null;
    if (explicita) return explicita;

    return new Date().toISOString().slice(0, 10);
  }

  private diasEstimadosPorDistancia(km: number): { diasMin: number; diasMax: number } {
    if (km <= 50) return { diasMin: 0, diasMax: 0 };
    if (km <= 150) return { diasMin: 1, diasMax: 1 };
    if (km <= 400) return { diasMin: 2, diasMax: 2 };
    if (km <= 800) return { diasMin: 3, diasMax: 3 };
    return { diasMin: 4, diasMax: 5 };
  }

  calcularFechasPorDistancia(
    distanciaKm: number,
    fechaReferencia: string,
  ): Pick<
    EstimarFechasResult,
    | 'fecha_estimada_inicio'
    | 'fecha_estimada_fin'
    | 'fecha_estimada_entrega'
    | 'fecha_referencia'
  > {
    const { diasMin, diasMax } = this.diasEstimadosPorDistancia(distanciaKm);
    const inicio = this.addDaysDateOnly(fechaReferencia, diasMin);
    const fin = this.addDaysDateOnly(fechaReferencia, diasMax);
    return {
      fecha_referencia: fechaReferencia,
      fecha_estimada_inicio: inicio,
      fecha_estimada_fin: fin,
      fecha_estimada_entrega: fin,
    };
  }

  private getGoogleMapsApiKey(): string {
    return String(process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  async calcularDistanciaVialGoogle(origen: string, destino: string) {
    return calcularDistanciaVialGoogle(
      origen,
      destino,
      this.getGoogleMapsApiKey(),
    );
  }

  /**
   * HU-24: distancia vial (Google Routes) o override manual → fechas estimadas HU-9.
   */
  async estimarFechas(body: EstimarFechasDto): Promise<EstimarFechasResult> {
    const fechaReferencia = this.resolveFechaReferencia(body);

    const manual = this.parseDistanciaKm(body.distancia_km);
    if (manual != null) {
      return {
        ok: true,
        distancia_km: manual,
        distancia_origen: 'manual',
        duracion_minutos: null,
        ...this.calcularFechasPorDistancia(manual, fechaReferencia),
      };
    }

    const origen = String(body.origen ?? '').trim();
    const destino = String(body.destino ?? '').trim();

    if (!origen || !destino) {
      return {
        ok: false,
        fecha_referencia: fechaReferencia,
        advertencia: ADVERTENCIA_DISTANCIA_VIAL,
      };
    }

    const vial = await this.calcularDistanciaVialGoogle(origen, destino);
    if (!vial.ok) {
      return {
        ok: false,
        fecha_referencia: fechaReferencia,
        advertencia: ADVERTENCIA_DISTANCIA_VIAL,
      };
    }

    return {
      ok: true,
      distancia_km: vial.distancia_km,
      distancia_origen: 'google_routes',
      duracion_minutos: vial.duracion_minutos,
      ...this.calcularFechasPorDistancia(vial.distancia_km, fechaReferencia),
    };
  }

  /**
   * Crea una ruta en Supabase.
   * Estado inicial: si vienen conductor_id y camion_id → ASIGNADO; si no → PENDIENTE.
   * Si el cliente envía `estado` explícito, debe ser uno del enum.
   */
  async createRoute(body: CreateRutaDto) {
    const cliente_id = String(body?.cliente_id ?? '').trim();
    const origen = String(body?.origen ?? '').trim();
    const destino = String(body?.destino ?? '').trim();

    if (!cliente_id) {
      throw new BadRequestException('cliente_id es obligatorio');
    }
    if (!origen) {
      throw new BadRequestException('origen es obligatorio');
    }
    if (!destino) {
      throw new BadRequestException('destino es obligatorio');
    }

    // Validar capacidad física permitida
    if (body.bultos_detalle && Array.isArray(body.bultos_detalle)) {
      let volumenAcumulado = 0;
      for (const b of body.bultos_detalle) {
        const alto = Number(b.alto_cm || 0);
        const ancho = Number(b.ancho_cm || 0);
        const largo = Number(b.largo_cm || 0);
        const volumen = alto * ancho * largo;
        if (largo > 500 || ancho > 200 || alto > 250 || volumen > 25000000) {
          throw new BadRequestException('Excede capacidad física permitida');
        }
        volumenAcumulado += volumen;
      }
      if (volumenAcumulado > 25000000) {
        throw new BadRequestException('Capacidad de volumen excedida para este envío. Requiere coordinar un camión adicional');
      }
    }

    const conductorRaw = body?.conductor_id;
    const camionRaw = body?.camion_id;
    const conductor_id =
      conductorRaw != null && String(conductorRaw).trim() !== ''
        ? String(conductorRaw).trim()
        : null;
    const camion_id =
      camionRaw != null && String(camionRaw).trim() !== ''
        ? String(camionRaw).trim()
        : null;

    const estadosValidos = [...RutasService.ESTADOS_RUTA];

    let estadoInicial: string;
    const estadoExplicito =
      body.estado != null && String(body.estado).trim() !== ''
        ? String(body.estado).trim().toUpperCase()
        : '';

    if (estadoExplicito) {
      if (!estadosValidos.includes(estadoExplicito as any)) {
        throw new BadRequestException(
          `Estado inválido. Valores permitidos (enum estado_ruta): ${estadosValidos.join(', ')}`,
        );
      }
      estadoInicial = estadoExplicito;
    } else if (conductor_id && camion_id) {
      estadoInicial = 'ASIGNADO';
    } else {
      estadoInicial = 'PENDIENTE';
    }

    const insert: Record<string, unknown> = {
      cliente_id,
      origen,
      destino,
      estado: estadoInicial,
    };

    if (conductor_id) {
      insert.conductor_id = conductor_id;
    }
    if (camion_id) {
      insert.camion_id = camion_id;
    }
    if (body.nombre_ruta != null && String(body.nombre_ruta).trim() !== '') {
      insert.nombre_ruta = String(body.nombre_ruta).trim();
    } else {
      const supabase = this.supabaseConfig.getClient();
      const { count } = await supabase.from('rutas').select('*', { count: 'exact', head: true });
      insert.nombre_ruta = `Ruta #${(count || 0) + 1}`;
    }

    if (body.fecha_inicio != null && String(body.fecha_inicio).trim() !== '') {
      insert.fecha_inicio = String(body.fecha_inicio).trim();
    }
    if (body.eta != null && String(body.eta).trim() !== '') {
      insert.eta = String(body.eta).trim();
    }

    // Aceptar bultos_despachados opcional enviado desde el panel web
    if (body.bultos_despachados != null && String(body.bultos_despachados).trim() !== '') {
      const raw = body.bultos_despachados;
      const val = Number(raw);
      if (!Number.isInteger(val) || val < 0) {
        throw new BadRequestException('bultos_despachados debe ser un entero no negativo');
      }
      insert.bultos_despachados = val;
    }

    if (estadoInicial === 'ASIGNADO' && insert.fecha_inicio === undefined) {
      insert.fecha_inicio = new Date().toISOString();
    }

    const distanciaKm = this.parseDistanciaKm(body.distancia_km);
    if (distanciaKm != null) {
      insert.distancia_km = distanciaKm;
    }

    if (body.costo_tac_peajes_clp != null && String(body.costo_tac_peajes_clp).trim() !== '') {
      insert.costo_tac_peajes_clp = Number(body.costo_tac_peajes_clp);
    }
    if (body.pago_conductor_base_clp != null && String(body.pago_conductor_base_clp).trim() !== '') {
      insert.pago_conductor_base_clp = Number(body.pago_conductor_base_clp);
    }
    if (body.is_tarifa_manual != null) {
      insert.is_tarifa_manual = Boolean(body.is_tarifa_manual);
    }
    if (body.tarifa_base_total != null && String(body.tarifa_base_total).trim() !== '') {
      insert.tarifa_base_total = Number(body.tarifa_base_total);
    }

    const feInicio = this.parseDateOnly(body.fecha_estimada_inicio);
    const feFin = this.parseDateOnly(body.fecha_estimada_fin);
    const feEntrega = this.parseDateOnly(body.fecha_estimada_entrega);
    if (feInicio || feFin || feEntrega) {
      if (!feInicio || !feFin || !feEntrega) {
        throw new BadRequestException(
          'Si indica fechas estimadas, debe enviar fecha_estimada_inicio, fecha_estimada_fin y fecha_estimada_entrega',
        );
      }
      this.validarRangoFechasEstimadas(feInicio, feFin, feEntrega);
      insert.fecha_estimada_inicio = feInicio;
      insert.fecha_estimada_fin = feFin;
      insert.fecha_estimada_entrega = feEntrega;
    }

    // CA-3: bloquear asignación si la licencia está vencida (misma regla que POST /assign)
    if (conductor_id) {
      const licenseValidation =
        await this.conductoresService.validateDriverLicense(conductor_id);
      if (!licenseValidation.isValid) {
        throw new ForbiddenException(
          `No se puede asignar conductor a la ruta: ${licenseValidation.message}`,
        );
      }
    }

    const supabase = this.supabaseConfig.getClient();

    // Validar capacidad del camión si se asigna desde la creación
    if (camion_id && insert.bultos_despachados) {
      const slotsRequeridos = insert.bultos_despachados as number;
      const { data: camion, error: camionError } = await supabase
        .from('camiones')
        .select('id, slots, slots_utilizados, estado')
        .eq('id', camion_id)
        .single();

      if (camionError || !camion) {
        throw new NotFoundException('Camión no encontrado');
      }
      if (camion.estado !== 'DISPONIBLE') {
        throw new ForbiddenException(`El camión no está disponible (estado: ${camion.estado})`);
      }

      const maxSlots = (camion.slots as number) ?? 96;
      const slotsUtilizados = (camion.slots_utilizados as number) ?? 0;

      if ((slotsUtilizados + slotsRequeridos) > maxSlots) {
        throw new ForbiddenException(
          `Capacidad insuficiente: el camión tiene ${maxSlots} slots en total y ${slotsUtilizados} ocupados. Se requieren ${slotsRequeridos} adicionales.`,
        );
      }
    }

    const { data: created, error } = await supabase
      .from('rutas')
      .insert(insert)
      .select(
        `
        id,
        nombre_ruta,
        cliente_id,
        conductor_id,
        camion_id,
        origen,
        destino,
        estado,
        fecha_inicio,
        fecha_fin,
        eta,
        distancia_km,
        fecha_estimada_inicio,
        fecha_estimada_fin,
        fecha_estimada_entrega,
        tarifa_base_total,
        costo_espera_total,
        total_pagar,
        costo_servicio,
        costo_tac_peajes_clp,
        pago_conductor_base_clp,
        costo_combustible_calculado,
        is_tarifa_manual,
        created_at,
        ficha_despacho_url,
        clientes(id, nombre),
        conductores(id, rut),
        camiones(id, patente)
      `,
      )
      .single();

    if (error) {
      console.error('createRoute Supabase:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new BadRequestException(
        `No se pudo crear la ruta: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
      );
    }

    // Insertar bultos si existen
    if (body.bultos_detalle && Array.isArray(body.bultos_detalle) && body.bultos_detalle.length > 0) {
      const inserts = body.bultos_detalle.map(b => ({
        ruta_id: created.id,
        alto_cm: Number(b.alto_cm),
        ancho_cm: Number(b.ancho_cm),
        largo_cm: Number(b.largo_cm),
        peso_kg: Number(b.peso_kg),
        categoria: null as string | null,
        tarifa_calculada_clp: 0
      }));

      const { error: bultosError } = await supabase
        .from('bultos')
        .insert(inserts);

      if (bultosError) {
        console.error('Error al insertar bultos:', bultosError);
        throw new BadRequestException(`Error al registrar el detalle de bultos: ${bultosError.message}`);
      }
    }

    if (estadoInicial === 'ASIGNADO') {
      await this.calcularYBloquearTarifaRuta(supabase, created.id);
    }

    try {
      await supabase.from('historial_estados').insert([
        {
          ruta_id: created.id,
          estado: estadoInicial,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('createRoute historial_estados omitido:', msg);
    }

    // Actualizar slots_utilizados si se asignó un camión con bultos en la creación
    if (camion_id && insert.bultos_despachados) {
      try {
        const slotsRequeridos = insert.bultos_despachados as number;
        // Obtenemos los slots actuales de nuevo para evitar desactualización,
        // aunque ya lo vimos arriba, es mejor hacer la suma
        const { data: camion } = await supabase
          .from('camiones')
          .select('slots_utilizados')
          .eq('id', camion_id)
          .single();
          
        const slotsUtilizados = (camion?.slots_utilizados as number) ?? 0;
        await supabase
          .from('camiones')
          .update({ slots_utilizados: slotsUtilizados + slotsRequeridos })
          .eq('id', camion_id);
      } catch (e: unknown) {
        console.warn('createRoute update camiones omitido:', e);
      }
    }

    return created;
  }

  /**
   * Registra una anomalía asociada a una ruta.
   */
  async createAnomalia(rutaId: string, body: CreateAnomaliaDto) {
    const rutaUuid = String(rutaId ?? '').trim();
    if (!rutaUuid) {
      throw new BadRequestException('ruta_id es obligatorio');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: existingRoute, error: routeError } = await supabase
      .from('rutas')
      .select('id')
      .eq('id', rutaUuid)
      .maybeSingle();

    if (routeError) {
      console.error('createAnomalia Supabase route check:', routeError);
      throw new BadRequestException(`Error al validar ruta: ${routeError.message}`);
    }

    if (!existingRoute) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaUuid}`);
    }

    const insertPayload = {
      ruta_id: rutaUuid,
      titulo: String(body.titulo).trim(),
      es_prioritario: body.es_prioritario,
      descripcion: String(body.descripcion).trim(),
      foto_url:
        body.foto_url != null && String(body.foto_url).trim() !== ''
          ? String(body.foto_url).trim()
          : null,
    };

    const { data, error } = await supabase
      .from('anomalias')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) {
      console.error('createAnomalia Supabase:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new BadRequestException(
        `No se pudo crear la anomalía: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
      );
    }

    return data;
  }

  /**
   * Devuelve las anomalías reportadas para una ruta
   */
  async getAnomaliasByRuta(rutaId: string) {
    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('anomalias')
      .select(
        `
        id,
        ruta_id,
        titulo,
        descripcion,
        foto_url,
        es_prioritario,
        created_at
      `,
      )
      .eq('ruta_id', rutaId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Error al obtener anomalías: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Asigna un conductor a una ruta después de validar su licencia
   */
  async assignDriverToRoute(
    rutaId: string,
    conductorId: string,
    camionId: string,
    userId: string, // Usuario que hace la asignación (debe ser admin/dispatcher)
    slotsRequeridos?: number,
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

    // PASO 2: Validar capacidad del camión (Estrategia Defensiva)
    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, patente, slots, slots_utilizados, estado')
      .eq('id', camionId)
      .single();

    if (camionError || !camion) {
      throw new NotFoundException('Camión no encontrado');
    }

    if (camion.estado !== 'DISPONIBLE') {
      throw new ForbiddenException(`El camión no está disponible (estado: ${camion.estado})`);
    }

    const maxSlots = (camion.slots as number) ?? 96;
    const slotsUtilizados = (camion.slots_utilizados as number) ?? 0;

    if (slotsRequeridos && (slotsUtilizados + slotsRequeridos) > maxSlots) {
      throw new ForbiddenException(
        `Capacidad insuficiente: el camión tiene ${maxSlots} slots en total y ${slotsUtilizados} ocupados. Se requieren ${slotsRequeridos} adicionales (Total proyectado: ${slotsUtilizados + slotsRequeridos}).`,
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

    // PASO 3.5: Actualizar capacidad utilizada del camión
    if (slotsRequeridos && slotsRequeridos > 0) {
      const { error: updateCamionError } = await supabase
        .from('camiones')
        .update({ slots_utilizados: slotsUtilizados + slotsRequeridos })
        .eq('id', camionId);

      if (updateCamionError) {
        throw new BadRequestException('Error al actualizar la capacidad del camión');
      }
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

    await this.calcularYBloquearTarifaRuta(supabase, rutaId);

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
        nombre_ruta,
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
        nombre_ruta,
        origen,
        destino,
        estado,
        fecha_inicio,
        fecha_fin,
        eta,
        tiempo_espera_minutos,
        hora_llegada_destino,
        hora_inspeccion_aprobada,
        created_at,
        cliente_id,
        conductor_id,
        camion_id,
        ficha_despacho_url,
        distancia_km,
        fecha_estimada_inicio,
        fecha_estimada_fin,
        fecha_estimada_entrega,
        notificacion_fecha_estimada_enviada_at,
        notificacion_fecha_estimada_destinatario,
        clientes(id, nombre, contacto_email),
        conductores(id, rut, licencia_vencimiento),
        camiones(id, patente, slots, slots_utilizados, talla)
      `)
      .eq('id', rutaId)
      .single();

    if (error) {
      throw new NotFoundException(`Ruta no encontrada: ${error.message}`);
    }

    // HU-20: separar ficha de despacho de evidencias normales en el detalle.
    const { fichasDespacho, fotosEvidencia } =
      await this.fetchFichasYEvidenciasParaRuta(rutaId);

    return {
      ...ruta,
      fichasDespacho,
      fotosEvidencia,
      licenseStatus: ruta.conductor_id
        ? await this.conductoresService.validateDriverLicense(ruta.conductor_id)
        : null,
    };
  }

  async getRouteTracking(rutaId: string): Promise<RouteTrackingDto> {
    const rutaUuid = String(rutaId ?? '').trim();
    if (!rutaUuid) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error: routeError } = await supabase
      .from('rutas')
      .select('id, fecha_inicio, fecha_fin')
      .eq('id', rutaUuid)
      .maybeSingle();

    if (routeError) {
      throw new BadRequestException(`Error al validar ruta: ${routeError.message}`);
    }
    if (!ruta) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaUuid}`);
    }

    const gpsQuery = await supabase
      .from('traceability_events')
      .select('latitud, longitud, timestamp_evento')
      .eq('ruta_id', rutaUuid)
      .order('timestamp_evento', { ascending: true });

    let rawRows = gpsQuery.data || [];
    const rawErrorMessage = (gpsQuery.error as { message?: string } | undefined)
      ?.message;
    const columnMissing =
      gpsQuery.error &&
      /ruta_id/i.test(rawErrorMessage || '') &&
      TRACEABILITY_RUTA_ID_MISSING_CODES.has((gpsQuery.error as { code?: string }).code || '');

    if (gpsQuery.error && columnMissing) {
      if (!ruta.fecha_inicio) {
        return { ubicacion_actual: null, historial: [] };
      }

      const desde = String(ruta.fecha_inicio);
      const hasta = String(ruta.fecha_fin || new Date().toISOString());

      const fallback = await supabase
        .from('traceability_events')
        .select('latitud, longitud, timestamp_evento')
        .gte('timestamp_evento', desde)
        .lte('timestamp_evento', hasta)
        .order('timestamp_evento', { ascending: true });

      if (fallback.error) {
        return { ubicacion_actual: null, historial: [] };
      }
      rawRows = fallback.data || [];
    } else if (gpsQuery.error) {
      throw new BadRequestException(
        `Error al obtener historial GPS: ${gpsQuery.error.message}`,
      );
    }

    const historial: RouteTrackingPointDto[] = (rawRows || [])
      .filter(
        (row): row is {
          latitud: unknown;
          longitud: unknown;
          timestamp_evento: unknown;
        } => row != null,
      )
      .map((row) => ({
        latitud: Number(row.latitud),
        longitud: Number(row.longitud),
        timestamp_evento:
          row.timestamp_evento != null ? String(row.timestamp_evento) : null,
      }))
      .filter(
        (row) =>
          Number.isFinite(row.latitud) && Number.isFinite(row.longitud),
      );

    return {
      historial,
      ubicacion_actual: historial.length
        ? historial[historial.length - 1]
        : null,
    };
  }

  /**
   * Devuelve fichas de despacho y evidencias normales de una ruta a partir
   * de `traceability_events`, sin mezclar la ficha con el resto. Usado
   * tanto por `getRouteInfo` como por `listRoutes` cuando se pide detalle.
   *
   * Tolerante a la ausencia de la columna `tipo` en BDs antiguas.
   */
  private async fetchFichasYEvidenciasParaRuta(rutaId: string) {
    const supabase = this.supabaseConfig.getClient();

    type FotoMin = {
      id: string;
      etapa: string | null;
      url: string;
      timestamp: string | null;
      tipo: string | null;
    };

    const fichasDespacho: FotoMin[] = [];
    const fotosEvidencia: FotoMin[] = [];

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

    if (traceRuta.error || !traceRuta.data) {
      return { fichasDespacho, fotosEvidencia };
    }

    for (const ev of traceRuta.data) {
      if (!ev?.foto_uri) continue;
      const url = this.supabaseConfig.getPublicUrl(
        'fotos_trazabilidad',
        ev.foto_uri,
      );
      if (!url) continue;

      const tipoEv =
        'tipo' in (ev as object)
          ? (ev as { tipo?: string | null }).tipo ?? null
          : null;
      const etapaNorm = String(ev.etapa || '').trim();
      const etapaUpper = etapaNorm.toUpperCase();
      const esFicha =
        String(tipoEv || '').toUpperCase() === 'FICHA_DESPACHO' ||
        etapaUpper === 'HOJA_DESPACHO' ||
        etapaNorm.toLowerCase() === 'ficha';

      const item: FotoMin = {
        id: String(ev.id ?? `ev-${ev.foto_uri}`),
        etapa: ev.etapa ?? null,
        url,
        timestamp: ev.timestamp_evento ?? null,
        tipo: tipoEv,
      };

      if (esFicha) {
        fichasDespacho.push(item);
      } else {
        fotosEvidencia.push(item);
      }
    }

    return { fichasDespacho, fotosEvidencia };
  }

  /**
   * Cambia el estado de una ruta
   */
  async updateRouteStatus(rutaId: string, nuevoEstado: string) {
    if (!rutaId || !nuevoEstado) {
      throw new BadRequestException('rutaId y nuevoEstado son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    const estadosValidos = [...RutasService.ESTADOS_RUTA];

    if (!estadosValidos.includes(nuevoEstado as any)) {
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

    if (nuevoEstado === 'ASIGNADO') {
      await this.calcularYBloquearTarifaRuta(supabase, rutaId);
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

  async updateTiemposInspeccion(rutaId: string, params: { hora_llegada_destino?: string; hora_inspeccion_aprobada?: string }) {
    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error: fetchError } = await supabase
      .from('rutas')
      .select('hora_llegada_destino, hora_inspeccion_aprobada, tarifa_base_total')
      .eq('id', rutaId)
      .single();

    if (fetchError || !ruta) {
      throw new BadRequestException('Ruta no encontrada');
    }

    const patch: any = {};
    if (params.hora_llegada_destino) {
      patch.hora_llegada_destino = params.hora_llegada_destino;
    }
    if (params.hora_inspeccion_aprobada) {
      patch.hora_inspeccion_aprobada = params.hora_inspeccion_aprobada;
    }

    // Calcular tiempo en minutos
    const llegada = patch.hora_llegada_destino || ruta.hora_llegada_destino;
    const aprobacion = patch.hora_inspeccion_aprobada || ruta.hora_inspeccion_aprobada;

    if (llegada && aprobacion) {
      const msDifference = new Date(aprobacion).getTime() - new Date(llegada).getTime();
      const mins = Math.max(0, Math.floor(msDifference / 60000));
      patch.tiempo_espera_minutos = mins;

      let costoEspera = 0;
      if (mins > 60) {
        patch.estado = 'CANCELADO';
        costoEspera = 0;
      } else if (mins > 30) {
        costoEspera = 20000;
      } else if (mins > 15) {
        costoEspera = (mins - 15) * 300;
      }

      patch.costo_espera_total = costoEspera;
      const baseTotal = Number(ruta.tarifa_base_total || 0);
      patch.total_pagar = baseTotal + costoEspera;
    }

    const { data, error } = await supabase
      .from('rutas')
      .update(patch)
      .eq('id', rutaId)
      .select();

    if (error) {
      throw new BadRequestException(`Error al actualizar tiempos: ${error.message}`);
    }

    if (patch.estado === 'CANCELADO') {
      try {
        await supabase.from('historial_estados').insert([
          {
            ruta_id: rutaId,
            estado: 'CANCELADO',
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (histErr: any) {
        console.warn('updateTiemposInspeccion: error guardando historial cancelado:', histErr.message);
      }
    }

    return { message: 'Tiempos actualizados correctamente', ruta: data[0] };
  }

  /**
   * Lista todas las rutas con filtros opcionales y paginación
   */
  async listRoutes(filters?: {
    estado?: string;
    conductorId?: string;
    clienteId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase.from('rutas').select(`
      id,
      nombre_ruta,
      origen,
      destino,
      estado,
      fecha_inicio,
      fecha_fin,
      eta,
      created_at,
      tiempo_espera_minutos,
      hora_llegada_destino,
      hora_inspeccion_aprobada,
      cliente_id,
      conductor_id,
      camion_id,
      ficha_despacho_url,
      distancia_km,
      fecha_estimada_inicio,
      fecha_estimada_fin,
      fecha_estimada_entrega,
      notificacion_fecha_estimada_enviada_at,
      notificacion_fecha_estimada_destinatario,
      bultos_despachados,
      tarifa_base_total,
      costo_espera_total,
      total_pagar,
      costo_servicio,
      costo_tac_peajes_clp,
      pago_conductor_base_clp,
      costo_combustible_calculado,
      is_tarifa_manual,
      clientes(id, nombre, contacto_email),
      conductores(id, rut),
      camiones(id, patente)
    `, { count: 'exact' });

    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    if (filters?.conductorId) {
      query = query.eq('conductor_id', filters.conductorId);
    }

    if (filters?.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }

    if (filters?.search) {
      const q = filters.search.trim();

      // Buscamos clientes que coincidan
      const { data: clients } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nombre', `%${q}%`);
      const clientIds = clients?.map((c) => c.id) || [];

      // Buscamos conductores que coincidan (por rut o nombre)
      const { data: conductors } = await supabase
        .from('conductores')
        .select('id')
        .or(`nombre.ilike.%${q}%,rut.ilike.%${q}%`);
      const conductorIds = conductors?.map((c) => c.id) || [];

      // Construimos el filtro OR dinámicamente
      // Simulamos "nombre de ruta" usando el origen o destino
      let orString = `origen.ilike.%${q}%,destino.ilike.%${q}%`;
      
      if (clientIds.length > 0) {
        orString += `,cliente_id.in.(${clientIds.join(',')})`;
      }
      
      if (conductorIds.length > 0) {
        orString += `,conductor_id.in.(${conductorIds.join(',')})`;
      }

      query = query.or(orString);
    }

    const { data: rutas, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new BadRequestException(`Error al obtener rutas: ${error.message}`);
    }

    const total_items = count || 0;
    const total_pages = Math.ceil(total_items / limit);

    return {
      data: rutas || [],
      meta: {
        total_items,
        total_pages,
        current_page: page,
        limit,
      }
    };
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
      .select('id, fecha_inicio, fecha_fin, ficha_despacho_url')
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
      const etapaNorm = String(f.etapa || '').trim();
      const etapaLower = etapaNorm.toLowerCase();
      if (etapaLower === 'ficha') return true;
      if (etapaNorm.toUpperCase() === 'HOJA_DESPACHO') return true;
      return false;
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

    // HU-20: si no detectamos ficha desde fotos/traceability pero la
    // ruta sí tiene URL persistida (subida web vía entregas/photo o
    // vinculada por el servicio de trazabilidad), exponemos esa URL
    // como ficha para que el modal de evidencias pueda mostrarla.
    const fichaUrlRuta = String(ruta.ficha_despacho_url || '').trim();
    if (fichaUrlRuta && !urlsVistas.has(fichaUrlRuta)) {
      fichasDespacho.push({
        id: `ruta-${rutaId}`,
        etapa: 'HOJA_DESPACHO',
        url: fichaUrlRuta,
        timestamp: null,
        fuente: 'fotos_tabla',
        tipo: 'FICHA_DESPACHO',
      });
    }

    return {
      rutaId,
      pdfs,
      fotos,
      fotosEvidencia,
      fichasDespacho,
      fichaDespachoUrl: fichaUrlRuta || null,
      firmaUrl,
    };
  }

  /**
   * HU-9: actualiza rango y día estimado de entrega en la ruta.
   */
  async updateFechasEstimadas(
    rutaId: string,
    body: {
      fecha_estimada_inicio?: string;
      fecha_estimada_fin?: string;
      fecha_estimada_entrega?: string;
      distancia_km?: number | string | null;
    },
  ) {
    if (!rutaId?.trim()) {
      throw new BadRequestException('rutaId es requerido');
    }

    const inicio = this.parseDateOnly(body?.fecha_estimada_inicio);
    const fin = this.parseDateOnly(body?.fecha_estimada_fin);
    const entrega = this.parseDateOnly(body?.fecha_estimada_entrega);

    if (!inicio || !fin || !entrega) {
      throw new BadRequestException(
        'fecha_estimada_inicio, fecha_estimada_fin y fecha_estimada_entrega son obligatorias (formato YYYY-MM-DD)',
      );
    }

    this.validarRangoFechasEstimadas(inicio, fin, entrega);

    const patch: Record<string, unknown> = {
      fecha_estimada_inicio: inicio,
      fecha_estimada_fin: fin,
      fecha_estimada_entrega: entrega,
    };
    if (body.distancia_km !== undefined) {
      patch.distancia_km = this.parseDistanciaKm(body.distancia_km);
    }

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas')
      .update(patch)
      .eq('id', rutaId)
      .select(
        `
        id,
        origen,
        destino,
        distancia_km,
        fecha_estimada_inicio,
        fecha_estimada_fin,
        fecha_estimada_entrega,
        notificacion_fecha_estimada_enviada_at,
        notificacion_fecha_estimada_destinatario
      `,
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Ruta no encontrada: ${rutaId}`);
      }
      throw new BadRequestException(
        `No se pudieron guardar las fechas estimadas: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Fechas estimadas guardadas correctamente',
      data,
    };
  }

  /**
   * HU-9: envía notificación de fecha estimada al correo del cliente.
   */
  async notificarFechaEstimada(rutaId: string) {
    if (!rutaId?.trim()) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error } = await supabase
      .from('rutas')
      .select(
        `
        id,
        origen,
        destino,
        cliente_id,
        fecha_estimada_inicio,
        fecha_estimada_fin,
        fecha_estimada_entrega,
        clientes(id, nombre, contacto_email)
      `,
      )
      .eq('id', rutaId)
      .single();

    if (error || !ruta) {
      throw new NotFoundException(
        `Ruta no encontrada: ${error?.message ?? rutaId}`,
      );
    }

    const inicio = this.parseDateOnly(ruta.fecha_estimada_inicio);
    const fin = this.parseDateOnly(ruta.fecha_estimada_fin);
    const entrega = this.parseDateOnly(ruta.fecha_estimada_entrega);

    if (!inicio || !fin || !entrega) {
      throw new BadRequestException(
        'La ruta debe tener inicio de rango, fin de rango y día estimado de entrega antes de notificar.',
      );
    }

    this.validarRangoFechasEstimadas(inicio, fin, entrega);

    const clienteRaw = ruta.clientes as
      | { id?: string; nombre?: string; contacto_email?: string }
      | { id?: string; nombre?: string; contacto_email?: string }[]
      | null;
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;

    if (!ruta.cliente_id) {
      throw new BadRequestException(
        'La ruta no tiene cliente asociado. No se puede enviar la notificación.',
      );
    }

    const email = cliente?.contacto_email?.trim();
    if (!email) {
      throw new BadRequestException(
        'El cliente no tiene correo de contacto registrado (contacto_email). Actualice el cliente antes de notificar.',
      );
    }

    const nombreCliente = cliente?.nombre?.trim() || 'Cliente';
    const rangoInicioFmt = this.formatDateCl(inicio);
    const rangoFinFmt = this.formatDateCl(fin);
    const entregaFmt = this.formatDateCl(entrega);

    let asunto = `Entrega estimada - ${nombreCliente}`;
    let resendId: string | null = null;
    let envioError: string | null = null;

    try {
      const resultado = await this.emailService.enviarNotificacionFechaEstimada({
        email,
        nombreCliente,
        origen: String(ruta.origen || ''),
        destino: String(ruta.destino || ''),
        rutaId: ruta.id,
        rangoInicio: rangoInicioFmt,
        rangoFin: rangoFinFmt,
        fechaEstimadaEntrega: entregaFmt,
      });
      asunto = resultado.asunto;
      resendId = resultado.resendId ?? null;
      if (!resendId) {
        envioError = 'Resend no confirmó el id de envío del correo';
      }
    } catch (err: unknown) {
      envioError =
        err instanceof Error ? err.message : String(err ?? 'Error desconocido');
    }

    const enviadoAt = new Date().toISOString();

    if (envioError) {
      await supabase.from('notificaciones_cliente').insert({
        ruta_id: ruta.id,
        cliente_id: ruta.cliente_id,
        destinatario: email,
        tipo: 'FECHA_ESTIMADA_ENTREGA',
        asunto,
        estado: 'fallido',
        enviado_at: enviadoAt,
        error: envioError,
      });

      throw new InternalServerErrorException(
        `No se pudo enviar la notificación: ${envioError}`,
      );
    }

    const { error: histError } = await supabase
      .from('notificaciones_cliente')
      .insert({
        ruta_id: ruta.id,
        cliente_id: ruta.cliente_id,
        destinatario: email,
        tipo: 'FECHA_ESTIMADA_ENTREGA',
        asunto,
        estado: 'enviado',
        enviado_at: enviadoAt,
        error: null,
      });

    if (histError) {
      console.warn(
        'notificarFechaEstimada: correo enviado pero falló registro historial:',
        histError.message,
      );
    }

    await supabase
      .from('rutas')
      .update({
        notificacion_fecha_estimada_enviada_at: enviadoAt,
        notificacion_fecha_estimada_destinatario: email,
      })
      .eq('id', ruta.id);

    return {
      success: true,
      message: 'Notificación de fecha estimada enviada correctamente',
      destinatario: email,
      enviadoAt,
      rutaId: ruta.id,
      resendId,
    };
  }

  async calcularYBloquearTarifaRuta(supabase: any, rutaId: string) {
    console.log('calcularYBloquearTarifaRuta -> rutaId:', rutaId);
    try {
      const { data: ruta, error: rErr } = await supabase
        .from('rutas')
        .select('id, distancia_km, tarifa_base_total, costo_espera_total')
        .eq('id', rutaId)
        .single();

      if (rErr || !ruta) {
        console.warn('calcularYBloquearTarifaRuta: no se pudo cargar la ruta', rErr);
        return;
      }

      const { data: bultos, error: bErr } = await supabase
        .from('bultos')
        .select('*')
        .eq('ruta_id', rutaId);

      if (bErr || !bultos || bultos.length === 0) {
        console.log('calcularYBloquearTarifaRuta: no hay bultos registrados para esta ruta');
        return;
      }

      const dist = Number(ruta.distancia_km || 0);
      let baseTotal = 0;

      // Obtener matriz de tarifas de la base de datos
      const { data: matriz, error: mErr } = await supabase
        .from('tarifas_matriz')
        .select('*');

      if (mErr || !matriz) {
        console.warn('calcularYBloquearTarifaRuta: no se pudo cargar la matriz de tarifas', mErr);
        return;
      }

      // Buscar tarifa en la matriz
      const getTarifa = (categoria: string, km: number): number => {
        const queryKm = Math.min(3500, Math.max(0, km));
        const matching = matriz.find((t: any) => 
          queryKm >= t.tramo_min_km && 
          queryKm <= t.tramo_max_km && 
          t.categoria.toUpperCase() === categoria.toUpperCase()
        );
        return matching ? Number(matching.tarifa_clp) : 0;
      };

      for (const b of bultos) {
        const cat = b.categoria || 'XS';
        const tarifa = getTarifa(cat, dist);
        baseTotal += tarifa;

        await supabase
          .from('bultos')
          .update({ tarifa_calculada_clp: tarifa })
          .eq('id', b.id);
      }

      const costoEspera = Number(ruta.costo_espera_total || 0);
      await supabase
        .from('rutas')
        .update({
          tarifa_base_total: baseTotal,
          total_pagar: baseTotal + costoEspera
        })
        .eq('id', rutaId);

      console.log('calcularYBloquearTarifaRuta -> Terminado. Tarifa base total:', baseTotal);
    } catch (e: any) {
      console.error('Error en calcularYBloquearTarifaRuta:', e);
    }
  }
}
