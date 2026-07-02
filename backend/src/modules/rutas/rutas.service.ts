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
import { ConfiguracionPagosService } from '../configuracion-pagos/configuracion-pagos.service';
import { PagosClienteService } from '../pagos-cliente/pagos-cliente.service';
import { RutasPlantillaService } from '../rutas-plantilla/rutas-plantilla.service';
import { CostosOperativosService } from '../costos-operativos/costos-operativos.service';
import { CreateAnomaliaDto } from './dto/create-anomalia.dto';
import type { ConsolidarPedidoDto } from './dto/consolidar-pedido.dto';
import type { CreateRutaDto, ParadaRutaDto } from './dto/create-ruta.dto';
import type {
  EstimarTarifaDto,
  TarifaComercialResultDto,
  DesgloseTarifaBultoDto,
} from './dto/estimar-tarifa.dto';
import {
  advertenciasCapacidad,
  advertenciasDistanciaDestinos,
  calcularCapacidadRuta,
  type AdvertenciaConsolidacion,
  type CapacidadRuta,
} from './consolidacion.helper';

export type { CreateRutaDto } from './dto/create-ruta.dto';
export type {
  EstimarTarifaDto,
  TarifaComercialResultDto,
} from './dto/estimar-tarifa.dto';

const IVA_TARIFA_CLIENTE = 0.19;

/** Reglas de slots/descuento — port exacto de calculo-paquetes (CreadorCarga.jsx OBTENER_TARIFA_POR_TRAMO). */
const SLOTS_POR_CATEGORIA: Record<string, number> = {
  XS: 1,
  S: 4,
  M: 12,
  L: 24,
  XL: 48,
  MAXIMO: 96,
};

type ConteoSlotsFacturables = {
  countXL: number;
  countL: number;
  countM: number;
  countS: number;
  countXS: number;
};

function obtenerTarifaPorTramo(categoria: string, km: number): number {
  const bloques50km = Math.ceil(km / 50) || 1;
  const precioBasePorSlot = 1000 + bloques50km * 550;
  const cat = categoria.toUpperCase();
  const slots = SLOTS_POR_CATEGORIA[cat] ?? SLOTS_POR_CATEGORIA.XS;
  const desc =
    cat === 'S'
      ? 0.95
      : cat === 'M'
        ? 0.9
        : cat === 'L'
          ? 0.85
          : cat === 'XL'
            ? 0.8
            : cat === 'MAXIMO'
              ? 0.75
              : 1.0;
  return Math.round(precioBasePorSlot * slots * desc);
}

function descomponerSlotsEnCategorias(slotsParada: number): ConteoSlotsFacturables {
  let slotsToPrice = slotsParada;
  const countXL = Math.floor(slotsToPrice / 48);
  slotsToPrice %= 48;
  const countL = Math.floor(slotsToPrice / 24);
  slotsToPrice %= 24;
  const countM = Math.floor(slotsToPrice / 12);
  slotsToPrice %= 12;
  const countS = Math.floor(slotsToPrice / 4);
  slotsToPrice %= 4;
  const countXS = slotsToPrice;
  return { countXL, countL, countM, countS, countXS };
}

function sumarTarifaDescompuesta(
  conteo: ConteoSlotsFacturables,
  billedDistanceKm: number,
): number {
  let total = 0;
  if (conteo.countXL > 0) {
    total += conteo.countXL * obtenerTarifaPorTramo('XL', billedDistanceKm);
  }
  if (conteo.countL > 0) {
    total += conteo.countL * obtenerTarifaPorTramo('L', billedDistanceKm);
  }
  if (conteo.countM > 0) {
    total += conteo.countM * obtenerTarifaPorTramo('M', billedDistanceKm);
  }
  if (conteo.countS > 0) {
    total += conteo.countS * obtenerTarifaPorTramo('S', billedDistanceKm);
  }
  if (conteo.countXS > 0) {
    total += conteo.countXS * obtenerTarifaPorTramo('XS', billedDistanceKm);
  }
  return total;
}

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
  'No se pudo calcular la distancia vial autom├íticamente. Ingrese la distancia manualmente o revise origen/destino.';

@Injectable()
export class RutasService {
  /** Coincide con el enum `estado_ruta` en Supabase (ver tambi├®n updateRouteStatus). */
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
    private rutasPlantillaService: RutasPlantillaService,
    private pagosClienteService: PagosClienteService,
    private configuracionPagosService: ConfiguracionPagosService,
    private costosOperativosService: CostosOperativosService,
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
        'El d├¡a estimado debe estar entre la fecha de inicio y la fecha de fin del rango.',
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
   * HU-24: distancia vial (Google Routes) o override manual ÔåÆ fechas estimadas HU-9.
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
   * Crea una ruta/pedido operativo en Supabase (HU-58).
   * - Modo plantilla: copia origen/destino desde rutas_plantilla sin modificarla.
   * - Paradas: se persisten en rutas_paradas (solo afectan al pedido).
   * - Genera pago pendiente y calcula costo con tarifas configuradas.
   */
  async createRoute(body: CreateRutaDto) {
    const rutaPlantillaId = this.parseUuidOpcional(body?.ruta_plantilla_id);
    let plantillaOrigen: Awaited<
      ReturnType<RutasPlantillaService['getById']>
    > | null = null;

    if (rutaPlantillaId) {
      plantillaOrigen = await this.rutasPlantillaService.getById(rutaPlantillaId);
      if (!plantillaOrigen.activa) {
        throw new BadRequestException(
          'La ruta seleccionada no est├í activa o no existe',
        );
      }
    }

    let cliente_id = String(body?.cliente_id ?? '').trim();
    let origen = String(body?.origen ?? '').trim();
    let destino = String(body?.destino ?? '').trim();

    if (plantillaOrigen) {
      if (!origen) origen = String(plantillaOrigen.origen ?? '').trim();
      if (!destino) destino = String(plantillaOrigen.destino ?? '').trim();
    }

    if (!cliente_id) {
      throw new BadRequestException('cliente_id es obligatorio');
    }
    if (!origen) {
      throw new BadRequestException('origen es obligatorio');
    }
    if (!destino) {
      throw new BadRequestException('destino es obligatorio');
    }

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
        throw new BadRequestException(
          'Capacidad de volumen excedida para este envío. Requiere coordinar un camión adicional',
        );
      }
    }

    const fechaInicioRaw = body?.fecha_inicio;
    const fechaInicioExplicita =
      fechaInicioRaw != null && String(fechaInicioRaw).trim() !== ''
        ? String(fechaInicioRaw).trim()
        : null;

    const conductorRaw = body?.conductor_id;
    const camionRaw = body?.camion_id;
    let conductor_id =
      conductorRaw != null && String(conductorRaw).trim() !== ''
        ? String(conductorRaw).trim()
        : null;
    const camion_id =
      camionRaw != null && String(camionRaw).trim() !== ''
        ? String(camionRaw).trim()
        : null;

    const generadoAutomaticamente = body.generado_automaticamente === true;
    const recurrenciaId = this.parseUuidOpcional(body?.recurrencia_id);

    if (camion_id && !conductor_id) {
      const { data: conductorAsociado } = await this.supabaseConfig
        .getClient()
        .from('conductores')
        .select('id')
        .eq('camion_id', camion_id)
        .single();
      if (conductorAsociado) {
        conductor_id = conductorAsociado.id;
      }
    }

    if (!generadoAutomaticamente && conductor_id && !camion_id) {
      throw new BadRequestException('camion_id es obligatorio');
    }

    const estadosValidos = [...RutasService.ESTADOS_RUTA];

    let estadoInicial: string;
    const estadoExplicito =
      body.estado != null && String(body.estado).trim() !== ''
        ? String(body.estado).trim().toUpperCase()
        : '';

    if (estadoExplicito) {
      if (!estadosValidos.includes(estadoExplicito as any)) {
        throw new BadRequestException(
          `Estado inv├ílido. Valores permitidos (enum estado_ruta): ${estadosValidos.join(', ')}`,
        );
      }
      estadoInicial = estadoExplicito;
    } else if (conductor_id) {
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

    if (rutaPlantillaId) {
      insert.ruta_plantilla_id = rutaPlantillaId;
    }

    if (generadoAutomaticamente) {
      insert.generado_automaticamente = true;
      if (recurrenciaId) {
        insert.recurrencia_id = recurrenciaId;
      }
    }

    const observaciones =
      body.observaciones != null ? String(body.observaciones).trim() : '';
    if (observaciones) {
      insert.observaciones = observaciones;
    }

    if (conductor_id) {
      insert.conductor_id = conductor_id;
    }
    if (camion_id) {
      insert.camion_id = camion_id;
    }

    const nombreRutaExplicito =
      body.nombre_ruta != null && String(body.nombre_ruta).trim() !== ''
        ? String(body.nombre_ruta).trim()
        : '';
    if (nombreRutaExplicito) {
      insert.nombre_ruta = nombreRutaExplicito;
    } else if (plantillaOrigen?.nombre) {
      insert.nombre_ruta = plantillaOrigen.nombre;
    } else {
      const supabase = this.supabaseConfig.getClient();
      const { count } = await supabase
        .from('rutas')
        .select('*', { count: 'exact', head: true });
      insert.nombre_ruta = `Ruta #${(count || 0) + 1}`;
    }

    insert.fecha_inicio = fechaInicioExplicita ?? new Date().toISOString();

    if (body.eta != null && String(body.eta).trim() !== '') {
      insert.eta = String(body.eta).trim();
    }

    let bultosDespachados: number | null = null;
    if (
      body.bultos_despachados != null &&
      String(body.bultos_despachados).trim() !== ''
    ) {
      const val = Number(body.bultos_despachados);
      if (!Number.isInteger(val) || val < 0) {
        throw new BadRequestException(
          'bultos_despachados debe ser un entero no negativo',
        );
      }
      bultosDespachados = val;
      insert.bultos_despachados = val;
    }

    if (estadoInicial === 'ASIGNADO' && insert.fecha_inicio === undefined) {
      insert.fecha_inicio = new Date().toISOString();
    }

    let distanciaKm = this.parseDistanciaKm(body.distancia_km);
    if (distanciaKm == null && plantillaOrigen?.distanciaEstimada != null) {
      distanciaKm = this.parseDistanciaKm(plantillaOrigen.distanciaEstimada);
    }
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
    if (body.is_tarifa_manual && body.tarifa_base_total != null && String(body.tarifa_base_total).trim() !== '') {
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

    if (camion_id && insert.bultos_despachados) {
      const slotsRequeridos = insert.bultos_despachados as number;
      const { data: camion, error: camionError } = await supabase
        .from('camiones')
        .select('id, slots, slots_utilizados, estado')
        .eq('id', camion_id)
        .single();

      if (camionError || !camion) {
        throw new NotFoundException('Cami├│n no encontrado');
      }
      if (camion.estado !== 'DISPONIBLE') {
        throw new ForbiddenException(
          `El cami├│n no est├í disponible (estado: ${camion.estado})`,
        );
      }

      const maxSlots = (camion.slots as number) ?? 96;
      const slotsUtilizados = (camion.slots_utilizados as number) ?? 0;

      if (slotsUtilizados + slotsRequeridos > maxSlots) {
        throw new ForbiddenException(
          `Capacidad insuficiente: el cami├│n tiene ${maxSlots} slots en total y ${slotsUtilizados} ocupados. Se requieren ${slotsRequeridos} adicionales.`,
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
        ruta_plantilla_id,
        observaciones,
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

    const paradasPedido = this.resolveParadasPedido(body.paradas, plantillaOrigen);
    if (paradasPedido.length > 0) {
      await this.insertParadasRuta(created.id, paradasPedido);
    }

    if (body.bultos_detalle && Array.isArray(body.bultos_detalle) && body.bultos_detalle.length > 0) {
      const inserts = body.bultos_detalle.map((b) => {
        const cat = b.categoria || null;
        let cuadrados = 0;
        if (cat) {
          const map: Record<string, number> = {
            XS: 1,
            S: 4,
            M: 12,
            L: 24,
            XL: 48,
            MAXIMO: 96,
          };
          cuadrados = map[cat.toUpperCase()] || 0;
        }

        return {
          ruta_id: created.id,
          categoria: cat,
          tamaño: cat,
          cuadrados_equivalentes: cuadrados,
          tarifa_calculada_clp: 0,
        };
      });

      const { error: bultosError } = await supabase.from('bultos').insert(inserts);

      if (bultosError) {
        console.error('Error al insertar bultos:', bultosError);
        throw new BadRequestException(
          `Error al registrar el detalle de bultos: ${bultosError.message}`,
        );
      }

      await this.aplicarTarifaComercialARuta(supabase, created.id, {
        distanciaKm: distanciaKm ?? 0,
        bultosDetalle: body.bultos_detalle,
        isTarifaManual: Boolean(body.is_tarifa_manual),
        tarifaBaseManual: this.parseTarifaManual(body.tarifa_base_total),
        costoEsperaTotal: 0,
        bultosDespachados,
        cantidadParadas: paradasPedido.length || 1,
        modoRetorno: false,
      });
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

    if (camion_id && insert.bultos_despachados) {
      try {
        const slotsRequeridos = insert.bultos_despachados as number;
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

    let pagoGenerado: Awaited<
      ReturnType<PagosClienteService['crearPagoParaPedido']>
    > | null = null;
    try {
      const { data: rutaTarifada } = await supabase
        .from('rutas')
        .select('total_pagar, tarifa_base_total')
        .eq('id', created.id)
        .single();

      const montoPago =
        rutaTarifada?.total_pagar != null
          ? Number(rutaTarifada.total_pagar)
          : 0;
      const montoCalculado =
        montoPago > 0 ||
        (rutaTarifada?.tarifa_base_total != null &&
          Number(rutaTarifada.tarifa_base_total) > 0);

      pagoGenerado = await this.pagosClienteService.crearPagoParaPedido({
        clienteId: cliente_id,
        pedidoId: String(created.id),
        montoTotal: montoPago,
        montoCalculado,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('createRoute pago pendiente omitido:', msg);
    }

    if (!rutaPlantillaId && body.guardar_como_plantilla === true) {
      try {
        const nombrePlantilla =
          body.nombre_plantilla?.trim() ||
          nombreRutaExplicito ||
          String(insert.nombre_ruta);
        await this.rutasPlantillaService.create({
          nombre: nombrePlantilla,
          origen,
          destino,
          distanciaEstimada: distanciaKm ?? undefined,
          clienteId: cliente_id,
          paradas: paradasPedido.map((p) => ({
            direccion: p.direccion,
            orden: p.orden,
            latitud: p.latitud ?? undefined,
            longitud: p.longitud ?? undefined,
          })),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('createRoute guardar plantilla omitido:', msg);
      }
    }

    return {
      ...created,
      paradas: paradasPedido,
      pago: pagoGenerado,
    };
  }

  private parseUuidOpcional(value: unknown): string | null {
    const s = value != null ? String(value).trim() : '';
    return s || null;
  }

  private resolveParadasPedido(
    paradasBody: ParadaRutaDto[] | undefined,
    plantilla: { paradas?: Array<{ direccion: string; orden: number; latitud?: number | null; longitud?: number | null }> } | null,
  ): ParadaRutaDto[] {
    if (paradasBody?.length) {
      return paradasBody
        .filter((p) => p.direccion?.trim())
        .map((p) => ({
          direccion: p.direccion.trim(),
          orden: Number(p.orden),
          latitud: p.latitud ?? null,
          longitud: p.longitud ?? null,
          es_temporal: p.es_temporal !== false,
        }))
        .filter((p) => Number.isInteger(p.orden) && p.orden > 0)
        .sort((a, b) => a.orden - b.orden);
    }

    if (!plantilla?.paradas?.length) {
      return [];
    }

    return plantilla.paradas
      .filter((p) => p.direccion?.trim())
      .map((p) => ({
        direccion: p.direccion.trim(),
        orden: p.orden,
        latitud: p.latitud ?? null,
        longitud: p.longitud ?? null,
        es_temporal: false,
      }))
      .sort((a, b) => a.orden - b.orden);
  }

  private async insertParadasRuta(
    rutaId: string,
    paradas: ParadaRutaDto[],
  ): Promise<void> {
    if (!paradas.length) return;

    const supabase = this.supabaseConfig.getClient();
    const rows = paradas.map((p) => ({
      ruta_id: rutaId,
      direccion: p.direccion,
      orden: p.orden,
      latitud: p.latitud ?? null,
      longitud: p.longitud ?? null,
      es_temporal: p.es_temporal !== false,
    }));

    const { error } = await supabase.from('rutas_paradas').insert(rows);

    if (error) {
      console.warn('insertParadasRuta omitido:', error.message);
    }
  }

  /**
   * POST /api/rutas/estimar-tarifa — cotización comercial (única fuente de verdad).
   */
  async estimarTarifaComercial(
    body: EstimarTarifaDto,
  ): Promise<TarifaComercialResultDto> {
    const distanciaKm = this.parseDistanciaKm(body.distancia_km) ?? 0;
    const bultosDetalle = Array.isArray(body.bultos_detalle)
      ? body.bultos_detalle
      : [];
    const isTarifaManual = body.is_tarifa_manual === true;
    const tarifaBaseManual = this.parseTarifaManual(body.tarifa_base_total);
    const costoEsperaTotal = this.parseTarifaManual(body.costo_espera_total) ?? 0;

    const supabase = this.supabaseConfig.getClient();
    const tarifa = await this.calcularTarifaComercial(supabase, {
      distanciaKm,
      bultosDetalle,
      isTarifaManual,
      tarifaBaseManual,
      costoEsperaTotal,
      bultosDespachados: this.parseTarifaManual(body.bultos_despachados),
      cantidadParadas: Number(body.cantidad_paradas) || 0,
      modoRetorno: body.modo_retorno === true,
    });

    const incluirCostos =
      body.costo_tac_peajes_clp != null ||
      body.bultos_despachados != null ||
      body.cantidad_paradas != null;

    if (incluirCostos) {
      tarifa.costosOperativos = await this.calcularCostosOperativosPreview({
        distanciaKm,
        bultosDespachados: Number(body.bultos_despachados) || bultosDetalle.length,
        cantidadParadas: Number(body.cantidad_paradas) || 0,
        costoTac: this.parseTarifaManual(body.costo_tac_peajes_clp) ?? 0,
        rendimientoKmL: Number(body.rendimiento_km_l) > 0
          ? Number(body.rendimiento_km_l)
          : 4.5,
        modoRetorno: body.modo_retorno === true,
        tarifaBaseTotal: tarifa.tarifaBaseTotal,
      });
    }

    return tarifa;
  }

  private parseTarifaManual(value: unknown): number | null {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private slotsDeCategoria(categoria: string): number {
    return SLOTS_POR_CATEGORIA[categoria.toUpperCase()] ?? SLOTS_POR_CATEGORIA.XS;
  }

  /**
   * Port de billedDistanceKm (calculo-paquetes) cuando no hay tramos por parada en el payload.
   * Sin paradaId por bulto, se asume carga en la primera parada (índice 0).
   */
  private calcularBilledDistanceKmHistorico(params: {
    distanciaLogisticaKm: number;
    cantidadParadas: number;
    modoRetorno: boolean;
    paradaIndex: number;
  }): number {
    const n = Math.max(1, params.cantidadParadas);
    const isLastParada = params.paradaIndex === n - 1;

    if (params.modoRetorno) {
      const fromPrev = params.distanciaLogisticaKm / n;
      return Math.round(fromPrev);
    }

    if (n === 1) {
      return Math.round(params.distanciaLogisticaKm);
    }

    const fromPrev = params.distanciaLogisticaKm / n;
    const toOrigin = params.distanciaLogisticaKm / n;
    if (isLastParada) {
      return Math.round(fromPrev + toOrigin);
    }
    return Math.round(fromPrev);
  }

  private consolidarTarifaBultosHistorica(params: {
    distanciaKm: number;
    bultosDetalle: { categoria?: string | null }[];
    bultosDespachados?: number | null;
    cantidadParadas: number;
    modoRetorno: boolean;
  }): { tarifaBaseTotal: number; desglose: DesgloseTarifaBultoDto[] } {
    const cantidadParadas =
      params.cantidadParadas > 0 ? params.cantidadParadas : 1;

    // Sin paradaId en el payload: cada bulto se tarifica como unidad propia
    // (misma lógica que paradas.forEach con un bulto por parada).
    let tarifaBaseTotal = 0;
    const desglose: DesgloseTarifaBultoDto[] = [];

    params.bultosDetalle.forEach((b, indice) => {
      const cat = String(b.categoria || 'XS').toUpperCase();
      const slotsParada = this.slotsDeCategoria(cat);
      if (slotsParada === 0) return;

      const paradaIndex = 0;
      const billedDistanceKm = this.calcularBilledDistanceKmHistorico({
        distanciaLogisticaKm: params.distanciaKm,
        cantidadParadas,
        modoRetorno: params.modoRetorno,
        paradaIndex,
      });

      const conteo = descomponerSlotsEnCategorias(slotsParada);
      const tarifaBulto = sumarTarifaDescompuesta(conteo, billedDistanceKm);
      tarifaBaseTotal += tarifaBulto;
      desglose.push({
        indice: indice + 1,
        categoria: cat,
        tarifaClp: tarifaBulto,
      });
    });

    return { tarifaBaseTotal, desglose };
  }

  private async calcularTarifaComercial(
    _supabase: ReturnType<SupabaseConfigService['getClient']>,
    params: {
      distanciaKm: number;
      bultosDetalle: { categoria?: string | null }[];
      isTarifaManual: boolean;
      tarifaBaseManual: number | null;
      costoEsperaTotal: number;
      bultosDespachados?: number | null;
      cantidadParadas?: number;
      modoRetorno?: boolean;
    },
  ): Promise<TarifaComercialResultDto> {
    const {
      distanciaKm,
      bultosDetalle,
      isTarifaManual,
      tarifaBaseManual,
      costoEsperaTotal,
      bultosDespachados,
      cantidadParadas = 0,
      modoRetorno = false,
    } = params;

    let tarifaBaseTotal = 0;
    let fuente: TarifaComercialResultDto['fuente'] = 'sin_bultos';
    let desglose: DesgloseTarifaBultoDto[] = [];

    if (isTarifaManual && tarifaBaseManual != null && tarifaBaseManual >= 0) {
      tarifaBaseTotal = Math.round(tarifaBaseManual);
      fuente = 'manual';
    } else if (bultosDetalle.length > 0) {
      const consolidado = this.consolidarTarifaBultosHistorica({
        distanciaKm,
        bultosDetalle,
        bultosDespachados,
        cantidadParadas,
        modoRetorno,
      });
      tarifaBaseTotal = consolidado.tarifaBaseTotal;
      desglose = consolidado.desglose;
      fuente = 'matriz';
    }

    const iva = Math.round(tarifaBaseTotal * IVA_TARIFA_CLIENTE);
    const costoServicio = tarifaBaseTotal + iva;
    const costoEspera = Math.max(0, costoEsperaTotal);
    const totalPagar = costoServicio + costoEspera;

    return {
      tarifaBaseTotal,
      iva,
      costoServicio,
      costoEsperaTotal: costoEspera,
      totalPagar,
      isTarifaManual,
      desglose,
      fuente,
    };
  }

  private async aplicarTarifaComercialARuta(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    rutaId: string,
    params: {
      distanciaKm: number;
      bultosDetalle: { categoria?: string | null }[];
      isTarifaManual: boolean;
      tarifaBaseManual: number | null;
      costoEsperaTotal: number;
      bultosDespachados?: number | null;
      cantidadParadas?: number;
      modoRetorno?: boolean;
    },
  ): Promise<TarifaComercialResultDto | null> {
    try {
      const tarifa = await this.calcularTarifaComercial(supabase, params);

      const { error: updateError } = await supabase
        .from('rutas')
        .update({
          tarifa_base_total: tarifa.tarifaBaseTotal,
          costo_servicio: tarifa.costoServicio,
          total_pagar: tarifa.totalPagar,
          costo_espera_total: tarifa.costoEsperaTotal,
        })
        .eq('id', rutaId);

      if (updateError) {
        console.warn('aplicarTarifaComercialARuta:', updateError.message);
        return null;
      }

      if (tarifa.desglose.length > 0) {
        const { data: bultos } = await supabase
          .from('bultos')
          .select('id')
          .eq('ruta_id', rutaId)
          .order('created_at', { ascending: true });

        for (let i = 0; i < (bultos || []).length; i++) {
          const item = tarifa.desglose[i];
          if (!item || !bultos?.[i]?.id) continue;
          await supabase
            .from('bultos')
            .update({ tarifa_calculada_clp: item.tarifaClp })
            .eq('id', bultos[i].id);
        }
      }

      return tarifa;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('aplicarTarifaComercialARuta omitido:', msg);
      return null;
    }
  }

  private async calcularCostosOperativosPreview(params: {
    distanciaKm: number;
    bultosDespachados: number;
    cantidadParadas: number;
    costoTac: number;
    rendimientoKmL: number;
    modoRetorno: boolean;
    tarifaBaseTotal: number;
  }): Promise<{
    combustible: number;
    conductor: number;
    tac: number;
    total: number;
    margen: number;
  }> {
    const tarifas = await this.configuracionPagosService.getTarifas();
    const operativa = await this.configuracionPagosService.getConfiguracionOperativa();

    const conductor = Math.round(
      tarifas.precioPorRuta +
        params.cantidadParadas * tarifas.precioPorEntrega +
        params.bultosDespachados * tarifas.precioPorBulto +
        params.distanciaKm * tarifas.precioPorKm,
    );

    const kmCombustible = params.modoRetorno
      ? params.distanciaKm
      : params.distanciaKm * 2;
    const combustibleCalculado =
      params.distanciaKm > 0 && params.rendimientoKmL > 0
        ? Math.round(
            (kmCombustible / params.rendimientoKmL) *
              operativa.precioCombustibleLitro,
          )
        : 0;
    const combustible = params.modoRetorno ? 0 : combustibleCalculado;

    const tac = Math.round(params.costoTac);
    const total = combustible + tac + conductor;
    const margen = Math.round(params.tarifaBaseTotal - total);

    return {
      combustible: combustibleCalculado,
      conductor,
      tac,
      total,
      margen,
    };
  }

  /** @deprecated Usar calcularTarifaComercial — se mantiene el alias para asignación de ruta. */
  async calcularYBloquearTarifaRuta(supabase: any, rutaId: string) {
    try {
      const { data: ruta, error: rErr } = await supabase
        .from('rutas')
        .select(
          'id, distancia_km, costo_espera_total, is_tarifa_manual, tarifa_base_total',
        )
        .eq('id', rutaId)
        .single();

      if (rErr || !ruta) {
        console.warn('calcularYBloquearTarifaRuta: no se pudo cargar la ruta', rErr);
        return;
      }

      const { data: bultos, error: bErr } = await supabase
        .from('bultos')
        .select('categoria')
        .eq('ruta_id', rutaId);

      if (bErr || !bultos || bultos.length === 0) {
        return;
      }

      const { count: cantidadParadas } = await supabase
        .from('rutas_paradas')
        .select('*', { count: 'exact', head: true })
        .eq('ruta_id', rutaId);

      const { data: rutaSlots } = await supabase
        .from('rutas')
        .select('bultos_despachados')
        .eq('id', rutaId)
        .single();

      await this.aplicarTarifaComercialARuta(supabase, rutaId, {
        distanciaKm: Number(ruta.distancia_km || 0),
        bultosDetalle: bultos,
        isTarifaManual: Boolean(ruta.is_tarifa_manual),
        tarifaBaseManual: this.parseTarifaManual(ruta.tarifa_base_total),
        costoEsperaTotal: Number(ruta.costo_espera_total || 0),
        bultosDespachados: Number(rutaSlots?.bultos_despachados || 0) || null,
        cantidadParadas: cantidadParadas || 1,
        modoRetorno: false,
      });
    } catch (e: unknown) {
      console.error('Error en calcularYBloquearTarifaRuta:', e);
    }
  }

  /**
   * Registra una anomal├¡a asociada a una ruta.
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
        `No se pudo crear la anomal├¡a: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
      );
    }

    return data;
  }

  /**
   * Devuelve las anomal├¡as reportadas para una ruta
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
      throw new BadRequestException(`Error al obtener anomal├¡as: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Asigna un conductor a una ruta despu├®s de validar su licencia
   */
  async assignDriverToRoute(
    rutaId: string,
    conductorId: string,
    camionId: string,
    userId: string, // Usuario que hace la asignaci├│n (debe ser admin/dispatcher)
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

    // PASO 2: Validar capacidad del cami├│n (Estrategia Defensiva)
    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, patente, slots, slots_utilizados, estado')
      .eq('id', camionId)
      .single();

    if (camionError || !camion) {
      throw new NotFoundException('Cami├│n no encontrado');
    }

    if (camion.estado !== 'DISPONIBLE') {
      throw new ForbiddenException(`El cami├│n no est├í disponible (estado: ${camion.estado})`);
    }

    const maxSlots = (camion.slots as number) ?? 96;
    const slotsUtilizados = (camion.slots_utilizados as number) ?? 0;

    if (slotsRequeridos && (slotsUtilizados + slotsRequeridos) > maxSlots) {
      throw new ForbiddenException(
        `Capacidad insuficiente: el cami├│n tiene ${maxSlots} slots en total y ${slotsUtilizados} ocupados. Se requieren ${slotsRequeridos} adicionales (Total proyectado: ${slotsUtilizados + slotsRequeridos}).`,
      );
    }

    // PASO 3: Verificar que la ruta existe y no est├í asignada
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

    // PASO 3.5: Actualizar capacidad utilizada del cami├│n
    if (slotsRequeridos && slotsRequeridos > 0) {
      const { error: updateCamionError } = await supabase
        .from('camiones')
        .update({ slots_utilizados: slotsUtilizados + slotsRequeridos })
        .eq('id', camionId);

      if (updateCamionError) {
        throw new BadRequestException('Error al actualizar la capacidad del cami├│n');
      }
    }

    // PASO 4: Actualizar ruta con conductor y cami├│n.
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
   * Obtiene informaci├│n detallada de una ruta
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
      throw new BadRequestException(`Estado inv├ílido. Acepta: ${estadosValidos.join(', ')}`);
    }

    const patch: Record<string, unknown> = { estado: nuevoEstado };
    // Solo registrar fecha_fin al cerrar entrega; no borrar fecha_fin al
    // cambiar a otros estados (evita p├®rdida de auditor├¡a).
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

    if (nuevoEstado === 'ENTREGADO') {
      try {
        await this.costosOperativosService.congelarPorRuta(rutaId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('updateRouteStatus congelar costos omitido:', msg);
      }
    }

    return {
      success: true,
      message: `Ruta actualizada a estado: ${nuevoEstado}`,
      data: rutaActualizada[0],
    };
  }

  async registrarLlegadaDestino(rutaId: string) {
    const supabase = this.supabaseConfig.getClient();
    const now = new Date().toISOString();

    const patch = {
      hora_llegada_destino: now,
      estado: 'EN_DESTINO',
    };

    const { error } = await supabase.from('rutas').update(patch).eq('id', rutaId);

    if (error) {
      throw new InternalServerErrorException('Error al registrar llegada a destino');
    }

    return { success: true, hora_llegada_destino: now, estado: 'EN_DESTINO' };
  }

  async scanQrDestino(rutaId: string) {
    const supabase = this.supabaseConfig.getClient();

    const { data: ruta } = await supabase
      .from('rutas')
      .select('hora_llegada_destino')
      .eq('id', rutaId)
      .single();
    if (!ruta) throw new BadRequestException('Ruta no encontrada');

    const llegada = ruta.hora_llegada_destino
      ? new Date(ruta.hora_llegada_destino)
      : new Date();
    const now = new Date();
    const diffSeconds = Math.max(
      0,
      Math.floor((now.getTime() - llegada.getTime()) / 1000),
    );

    let costoExtra = 0;
    if (diffSeconds > 30) {
      costoExtra = Math.ceil((diffSeconds - 30) / 15) * 500;
    }

    const nuevoEstado = costoExtra > 0 ? 'PAGO_ATRASO_PENDIENTE' : 'COMPLETADO';

    const patch: Record<string, unknown> = {
      tiempo_espera_minutos: diffSeconds / 60,
      costo_espera_total: costoExtra,
      estado: nuevoEstado,
      fecha_fin: now.toISOString(),
    };

    const { error } = await supabase.from('rutas').update(patch).eq('id', rutaId);

    if (error) {
      throw new InternalServerErrorException(
        'Error al registrar el escaneo QR y cobros',
      );
    }

    return {
      success: true,
      diffSeconds,
      costoExtra,
      nuevoEstado,
    };
  }

  async updateTiemposInspeccion(rutaId: string, params: { hora_llegada_destino?: string; hora_inspeccion_aprobada?: string }) {
    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error: fetchError } = await supabase
      .from('rutas')
      .select('hora_llegada_destino, hora_inspeccion_aprobada')
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
    }

    const { data, error } = await supabase
      .from('rutas')
      .update(patch)
      .eq('id', rutaId)
      .select();

    if (error) {
      throw new BadRequestException(`Error al actualizar tiempos: ${error.message}`);
    }

    return { message: 'Tiempos actualizados correctamente', ruta: data[0] };
  }

  /**
   * Lista todas las rutas con filtros opcionales y paginaci├│n
   */
  async listRoutes(filters?: {
    estado?: string;
    conductorId?: string;
    clienteId?: string;
    search?: string;
    page?: number;
    limit?: number;
    generadoAutomaticamente?: boolean;
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
      estado_pago,
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
      ruta_maestra_id,
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
      generado_automaticamente,
      recurrencia_id,
      clientes(id, nombre, contacto_email),
      conductores(id, rut),
      camiones(id, patente, slots, slots_utilizados, talla)
    `, { count: 'exact' });

    // HU-59: ocultar pedidos hijos consolidados del listado principal.
    query = query.is('ruta_maestra_id', null);

    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    if (filters?.conductorId) {
      query = query.eq('conductor_id', filters.conductorId);
    }

    if (filters?.clienteId) {
      query = query.eq('cliente_id', filters.clienteId);
    }

    if (filters?.generadoAutomaticamente === true) {
      query = query.eq('generado_automaticamente', true);
    } else if (filters?.generadoAutomaticamente === false) {
      query = query.eq('generado_automaticamente', false);
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

      let orString = `origen.ilike.%${q}%,destino.ilike.%${q}%,nombre_ruta.ilike.%${q}%`;
      
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
   *  - `fotos`: uni├│n en orden ÔÇö tabla `fotos` por `ruta_id`, m├ís
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

    // ÔöÇÔöÇ 1) PDFs en bucket `entregas`, carpeta `comprobantes/{rutaId}/...`
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

    // ÔöÇÔöÇ 2) Fotos de trazabilidad (combinadas sin duplicar URLs)
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

    // 2a) Tabla `fotos` (prioridad por v├¡nculo directo ruta_id)
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
        'EVIDENCIAS -> traceability_events.ruta_id no disponible en BD (columna ausente); omitiendo v├¡nculo por ruta.',
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

    // ÔöÇÔöÇ 3) Firma: primero tabla `entregas`, fallback storage
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
    // ruta s├¡ tiene URL persistida (subida web v├¡a entregas/photo o
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
   * HU-9: actualiza rango y d├¡a estimado de entrega en la ruta.
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
   * HU-9: env├¡a notificaci├│n de fecha estimada al correo del cliente.
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
        'La ruta debe tener inicio de rango, fin de rango y d├¡a estimado de entrega antes de notificar.',
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
        'La ruta no tiene cliente asociado. No se puede enviar la notificaci├│n.',
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
        envioError = 'Resend no confirm├│ el id de env├¡o del correo';
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
        `No se pudo enviar la notificaci├│n: ${envioError}`,
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
        'notificarFechaEstimada: correo enviado pero fall├│ registro historial:',
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
      message: 'Notificaci├│n de fecha estimada enviada correctamente',
      destinatario: email,
      enviadoAt,
      rutaId: ruta.id,
      resendId,
    };
  }

  // ─── HU-59: Consolidación de pedidos en una misma ruta logística ───

  private readonly ESTADOS_CONSOLIDABLES = new Set(['PENDIENTE', 'ASIGNADO']);

  private mapPedidoConsolidacion(row: Record<string, unknown>) {
    const clientes = row.clientes as { nombre?: string } | null;
    return {
      id: row.id as string,
      nombre_ruta: row.nombre_ruta ?? null,
      origen: row.origen ?? '',
      destino: row.destino ?? '',
      distancia_km:
        row.distancia_km != null ? Number(row.distancia_km) : null,
      bultos_despachados:
        row.bultos_despachados != null
          ? Number(row.bultos_despachados)
          : 0,
      estado: row.estado ?? null,
      cliente_id: row.cliente_id ?? null,
      cliente_nombre: clientes?.nombre ?? null,
      es_maestra: row.ruta_maestra_id == null,
    };
  }

  private async resolverRutaMaestra(
    rutaId: string,
  ): Promise<Record<string, unknown>> {
    const supabase = this.supabaseConfig.getClient();
    const { data: ruta, error } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, cliente_id, conductor_id, camion_id, ruta_maestra_id, distancia_km, bultos_despachados, camiones(id, patente, slots, slots_utilizados, talla)',
      )
      .eq('id', rutaId)
      .single();

    if (error || !ruta) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaId}`);
    }

    if (ruta.ruta_maestra_id) {
      const { data: maestra, error: maestraError } = await supabase
        .from('rutas')
        .select(
          'id, nombre_ruta, origen, destino, estado, cliente_id, conductor_id, camion_id, ruta_maestra_id, distancia_km, bultos_despachados, camiones(id, patente, slots, slots_utilizados, talla)',
        )
        .eq('id', ruta.ruta_maestra_id)
        .single();

      if (maestraError || !maestra) {
        throw new NotFoundException(
          `Ruta maestra no encontrada para pedido ${rutaId}`,
        );
      }
      return maestra;
    }

    return ruta;
  }

  private async cargarPedidosGrupo(
    maestraId: string,
  ): Promise<Record<string, unknown>[]> {
    const supabase = this.supabaseConfig.getClient();

    const { data: maestra, error: maestraError } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, cliente_id, conductor_id, camion_id, ruta_maestra_id, distancia_km, bultos_despachados, clientes(id, nombre)',
      )
      .eq('id', maestraId)
      .single();

    if (maestraError || !maestra) {
      throw new NotFoundException(`Ruta maestra no encontrada: ${maestraId}`);
    }

    const { data: hijos, error: hijosError } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, cliente_id, conductor_id, camion_id, ruta_maestra_id, distancia_km, bultos_despachados, clientes(id, nombre)',
      )
      .eq('ruta_maestra_id', maestraId)
      .order('created_at', { ascending: true });

    if (hijosError) {
      throw new BadRequestException(
        `Error al cargar pedidos consolidados: ${hijosError.message}`,
      );
    }

    return [maestra, ...(hijos || [])];
  }

  private async cargarParadasMapa(
    pedidoIds: string[],
  ): Promise<
    Array<{
      pedido_id: string;
      tipo: 'origen' | 'destino' | 'parada';
      direccion: string;
      latitud: number | null;
      longitud: number | null;
      orden: number;
    }>
  > {
    if (!pedidoIds.length) return [];

    const supabase = this.supabaseConfig.getClient();
    const { data: rutas, error } = await supabase
      .from('rutas')
      .select('id, origen, destino')
      .in('id', pedidoIds);

    if (error) {
      throw new BadRequestException(
        `Error al cargar paradas de mapa: ${error.message}`,
      );
    }

    const { data: paradas, error: paradasError } = await supabase
      .from('rutas_paradas')
      .select('ruta_id, direccion, orden, latitud, longitud')
      .in('ruta_id', pedidoIds)
      .order('orden', { ascending: true });

    if (paradasError) {
      console.warn('cargarParadasMapa paradas omitidas:', paradasError.message);
    }

    const puntos: Array<{
      pedido_id: string;
      tipo: 'origen' | 'destino' | 'parada';
      direccion: string;
      latitud: number | null;
      longitud: number | null;
      orden: number;
    }> = [];

    for (const ruta of rutas || []) {
      const rid = ruta.id as string;
      puntos.push({
        pedido_id: rid,
        tipo: 'origen',
        direccion: String(ruta.origen ?? ''),
        latitud: null,
        longitud: null,
        orden: 0,
      });

      (paradas || [])
        .filter((p) => p.ruta_id === rid)
        .forEach((p) => {
          puntos.push({
            pedido_id: rid,
            tipo: 'parada',
            direccion: String(p.direccion ?? ''),
            latitud: p.latitud != null ? Number(p.latitud) : null,
            longitud: p.longitud != null ? Number(p.longitud) : null,
            orden: Number(p.orden) || 0,
          });
        });

      puntos.push({
        pedido_id: rid,
        tipo: 'destino',
        direccion: String(ruta.destino ?? ''),
        latitud: null,
        longitud: null,
        orden: 9999,
      });
    }

    return puntos;
  }

  private async calcularDistanciasEntreDestinos(
    destinos: string[],
  ): Promise<number[]> {
    const unicos = destinos
      .map((d) => String(d ?? '').trim())
      .filter(Boolean);
    if (unicos.length < 2) return [];

    const apiKey = this.getGoogleMapsApiKey();
    const distancias: number[] = [];

    for (let i = 0; i < unicos.length; i++) {
      for (let j = i + 1; j < unicos.length; j++) {
        const result = await calcularDistanciaVialGoogle(
          unicos[i],
          unicos[j],
          apiKey,
        );
        if (result.ok) {
          distancias.push(result.distancia_km);
        }
      }
    }

    return distancias;
  }

  private async evaluarConsolidacion(
    maestra: Record<string, unknown>,
    pedidosGrupo: Record<string, unknown>[],
    pedidoAdicional?: Record<string, unknown>,
  ): Promise<{
    capacidad: CapacidadRuta;
    advertencias: AdvertenciaConsolidacion[];
  }> {
    const camion = maestra.camiones as
      | { slots?: number; slots_utilizados?: number; talla?: string }
      | null
      | undefined;

    const slotsCamion = (camion?.slots as number) ?? 96;
    const bultosGrupo = pedidosGrupo.map((p) =>
      Number(p.bultos_despachados ?? 0),
    );
    const bultosAdicional = pedidoAdicional
      ? Number(pedidoAdicional.bultos_despachados ?? 0)
      : 0;

    const capacidad = calcularCapacidadRuta(slotsCamion, [
      ...bultosGrupo,
      ...(pedidoAdicional ? [bultosAdicional] : []),
    ]);

    if (camion?.talla) {
      capacidad.talla = String(camion.talla);
    }

    const advertencias = advertenciasCapacidad(
      calcularCapacidadRuta(slotsCamion, bultosGrupo),
      bultosAdicional,
    );

    const pedidosParaDistancia = [
      ...pedidosGrupo,
      ...(pedidoAdicional ? [pedidoAdicional] : []),
    ].map((p) => ({
      id: String(p.id),
      destino: String(p.destino ?? ''),
      distancia_km:
        p.distancia_km != null ? Number(p.distancia_km) : null,
    }));

    const destinos = pedidosParaDistancia.map((p) => p.destino).filter(Boolean);
    const distanciasEntreDestinos =
      destinos.length >= 2
        ? await this.calcularDistanciasEntreDestinos(destinos)
        : [];

    advertencias.push(
      ...advertenciasDistanciaDestinos(
        pedidosParaDistancia,
        distanciasEntreDestinos,
      ),
    );

    return { capacidad, advertencias };
  }

  async getConsolidacionInfo(rutaId: string) {
    const maestra = await this.resolverRutaMaestra(rutaId);
    const maestraId = String(maestra.id);
    const pedidosGrupo = await this.cargarPedidosGrupo(maestraId);
    const { capacidad, advertencias } = await this.evaluarConsolidacion(
      maestra,
      pedidosGrupo,
    );

    const supabase = this.supabaseConfig.getClient();
    const idsGrupo = new Set(pedidosGrupo.map((p) => String(p.id)));

    const { data: disponibles, error } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, cliente_id, distancia_km, bultos_despachados, clientes(id, nombre)',
      )
      .is('ruta_maestra_id', null)
      .in('estado', ['PENDIENTE', 'ASIGNADO'])
      .neq('id', maestraId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        `Error al listar pedidos disponibles: ${error.message}`,
      );
    }

    const pedidosDisponibles = (disponibles || [])
      .filter((p) => !idsGrupo.has(String(p.id)))
      .map((p) => this.mapPedidoConsolidacion(p as Record<string, unknown>));

    const paradasMapa = await this.cargarParadasMapa(
      pedidosGrupo.map((p) => String(p.id)),
    );

    return {
      ruta_maestra_id: maestraId,
      es_maestra: String(rutaId) === maestraId,
      pedidos: pedidosGrupo.map((p) => ({
        ...this.mapPedidoConsolidacion(p as Record<string, unknown>),
        es_maestra: String(p.id) === maestraId,
      })),
      capacidad,
      advertencias,
      paradas_mapa: paradasMapa,
      pedidos_disponibles: pedidosDisponibles,
    };
  }

  async consolidarPedido(rutaMaestraId: string, body: ConsolidarPedidoDto) {
    const pedidoId = String(body?.pedido_id ?? '').trim();
    if (!pedidoId) {
      throw new BadRequestException('pedido_id es requerido');
    }

    const supabase = this.supabaseConfig.getClient();
    const maestra = await this.resolverRutaMaestra(rutaMaestraId);
    const maestraId = String(maestra.id);

    if (maestra.ruta_maestra_id) {
      throw new BadRequestException(
        'Solo se puede consolidar bajo una ruta maestra',
      );
    }

    if (pedidoId === maestraId) {
      throw new BadRequestException(
        'No se puede consolidar un pedido consigo mismo',
      );
    }

    if (!maestra.camion_id) {
      throw new BadRequestException(
        'La ruta maestra debe tener un cami├│n asignado para consolidar pedidos',
      );
    }

    const { data: pedidoHijo, error: hijoError } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, cliente_id, conductor_id, camion_id, ruta_maestra_id, distancia_km, bultos_despachados',
      )
      .eq('id', pedidoId)
      .single();

    if (hijoError || !pedidoHijo) {
      throw new NotFoundException(`Pedido no encontrado: ${pedidoId}`);
    }

    if (pedidoHijo.ruta_maestra_id) {
      throw new BadRequestException('El pedido ya est├í consolidado en otra ruta');
    }

    if (!this.ESTADOS_CONSOLIDABLES.has(String(pedidoHijo.estado))) {
      throw new BadRequestException(
        `El pedido debe estar en estado PENDIENTE o ASIGNADO (actual: ${pedidoHijo.estado})`,
      );
    }

    const pedidosGrupo = await this.cargarPedidosGrupo(maestraId);
    const { advertencias } = await this.evaluarConsolidacion(
      maestra,
      pedidosGrupo,
      pedidoHijo as Record<string, unknown>,
    );

    const bloqueantes = advertencias.filter((a) => a.bloqueante);
    if (bloqueantes.length > 0) {
      throw new ForbiddenException({
        message: bloqueantes[0].mensaje,
        advertencias: bloqueantes,
      });
    }

    const advertenciasSuaves = advertencias.filter((a) => !a.bloqueante);
    if (advertenciasSuaves.length > 0) {
      const ignoraOcupacion = body.ignorar_advertencias_ocupacion === true;
      const ignoraDistancia = body.ignorar_advertencias_distancia === true;

      const pendientes = advertenciasSuaves.filter((a) => {
        if (a.tipo === 'ocupacion_baja') return !ignoraOcupacion;
        if (a.tipo === 'distancia_destinos') return !ignoraDistancia;
        return true;
      });

      if (pendientes.length > 0) {
        throw new BadRequestException({
          message: pendientes[0].mensaje,
          advertencias: advertenciasSuaves,
          requiere_confirmacion: true,
        });
      }
    }

    const bultosHijo = Number(pedidoHijo.bultos_despachados ?? 0);
    const camionMaestraId = String(maestra.camion_id);
    const camionHijoId = pedidoHijo.camion_id
      ? String(pedidoHijo.camion_id)
      : null;

    if (bultosHijo > 0) {
      const { data: camionMaestra } = await supabase
        .from('camiones')
        .select('slots, slots_utilizados')
        .eq('id', camionMaestraId)
        .single();

      const slotsMaestra = (camionMaestra?.slots as number) ?? 96;
      const utilizadosMaestra =
        (camionMaestra?.slots_utilizados as number) ?? 0;
      const bultosGrupo = pedidosGrupo.reduce(
        (sum, p) => sum + Number(p.bultos_despachados ?? 0),
        0,
      );

      if (bultosGrupo + bultosHijo > slotsMaestra) {
        throw new ForbiddenException(
          `Capacidad insuficiente: se requieren ${bultosGrupo + bultosHijo} slots y el cami├│n tiene ${slotsMaestra}.`,
        );
      }

      if (camionHijoId !== camionMaestraId) {
        await supabase
          .from('camiones')
          .update({ slots_utilizados: utilizadosMaestra + bultosHijo })
          .eq('id', camionMaestraId);
      }

      if (camionHijoId && camionHijoId !== camionMaestraId && bultosHijo > 0) {
        const { data: camionHijo } = await supabase
          .from('camiones')
          .select('slots_utilizados')
          .eq('id', camionHijoId)
          .single();

        const utilizadosHijo = (camionHijo?.slots_utilizados as number) ?? 0;
        await supabase
          .from('camiones')
          .update({
            slots_utilizados: Math.max(0, utilizadosHijo - bultosHijo),
          })
          .eq('id', camionHijoId);
      }
    }

    const updatePayload: Record<string, unknown> = {
      ruta_maestra_id: maestraId,
      conductor_id: maestra.conductor_id ?? null,
      camion_id: maestra.camion_id ?? null,
    };

    const estadoMaestra = String(maestra.estado ?? '');
    if (
      estadoMaestra === 'ASIGNADO' &&
      String(pedidoHijo.estado) === 'PENDIENTE'
    ) {
      updatePayload.estado = 'ASIGNADO';
    }

    const { error: updateError } = await supabase
      .from('rutas')
      .update(updatePayload)
      .eq('id', pedidoId);

    if (updateError) {
      throw new BadRequestException(
        `Error al consolidar pedido: ${updateError.message}`,
      );
    }

    if (updatePayload.estado) {
      try {
        await supabase.from('historial_estados').insert({
          ruta_id: pedidoId,
          estado: updatePayload.estado,
        });
      } catch (e: unknown) {
        console.warn('consolidarPedido historial_estados omitido:', e);
      }
    }

    return this.getConsolidacionInfo(maestraId);
  }
}
