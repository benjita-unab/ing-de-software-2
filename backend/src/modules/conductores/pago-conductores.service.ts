import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConfiguracionPagosService } from '../configuracion-pagos/configuracion-pagos.service';
import { PagoTarifas } from './pago-conductores.config';

export type PeriodoPago = 'diario' | 'semanal' | 'mensual' | 'rango';

export type RangoPeriodo = {
  tipo: PeriodoPago;
  fechaInicio: string;
  fechaFin: string;
};

export type MetricasOperacionales = {
  rutasCompletadas: number;
  entregasRealizadas: number;
  bultosEntregados: number;
  kilometrosRecorridos: number;
};

export type DesglosePago = {
  totalRutas: number;
  totalEntregas: number;
  totalBultos: number;
  totalKilometros: number;
  precioUnitarioRuta: number;
  precioUnitarioEntrega: number;
  precioUnitarioBulto: number;
  precioUnitarioKm: number;
  montoPorRutas: number;
  montoPorEntregas: number;
  montoPorBultos: number;
  montoPorKilometros: number;
  montoFinal: number;
};

export type RutaCompletadaResumen = {
  id: string;
  origen: string | null;
  destino: string | null;
  fechaCompletado: string | null;
  distanciaKm: number;
  bultosEntregados: number;
  entregasEnRuta: number;
};

export type MetricasPagoConductor = {
  conductorId: string;
  conductorRut: string | null;
  periodo: RangoPeriodo;
  metricas: MetricasOperacionales;
  desglose: DesglosePago;
  tarifas: PagoTarifas;
  rutas: RutaCompletadaResumen[];
};

export type ComparativaConductor = {
  conductorId: string;
  conductorRut: string | null;
  metricas: MetricasOperacionales;
  desglose: DesglosePago;
  ranking: number;
};

type EntregaRow = {
  id: string;
  bultos_recepcionados: number | null;
  fecha_entrega_real: string | null;
  validado: boolean | null;
  estado: string | null;
};

type RutaRow = {
  id: string;
  conductor_id: string | null;
  origen: string | null;
  destino: string | null;
  distancia_km: number | string | null;
  bultos_despachados: number | null;
  fecha_fin: string | null;
  fecha_inicio: string | null;
  estado: string;
  conductores?: { id: string; rut: string | null } | { id: string; rut: string | null }[] | null;
  entregas?: EntregaRow | EntregaRow[] | null;
};

const ESTADO_RUTA_COMPLETADA = 'ENTREGADO';

@Injectable()
export class PagoConductoresService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly configuracionPagosService: ConfiguracionPagosService,
  ) {}

  /**
   * HU-37: métricas y pago de un conductor en el período indicado.
   * Los datos se calculan en tiempo real desde rutas ENTREGADO (CA-04, CA-07).
   */
  async getMetricasPagoConductor(
    conductorId: string,
    periodo: PeriodoPago,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<MetricasPagoConductor> {
    if (!conductorId?.trim()) {
      throw new BadRequestException('conductorId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: conductor, error } = await supabase
      .from('conductores')
      .select('id, rut, activo')
      .eq('id', conductorId)
      .single();

    if (error || !conductor) {
      throw new NotFoundException('Conductor no encontrado');
    }

    const rango = this.resolvePeriodRange(periodo, fechaInicio, fechaFin);
    const tarifas = await this.configuracionPagosService.getTarifas();
    const rutas = await this.fetchRutasCompletadas({ conductorId, rango });
    const metricas = this.aggregateMetricas(rutas);
    const desglose = this.calculatePago(metricas, tarifas);

    return {
      conductorId: conductor.id,
      conductorRut: conductor.rut ?? null,
      periodo: rango,
      metricas,
      desglose,
      tarifas,
      rutas: rutas.map((r) => this.toRutaResumen(r)),
    };
  }

  /**
   * HU-50: desglose HU-37 para un único pedido/ruta (proyección o histórico).
   */
  async getDesglosePagoPorRutaId(rutaId: string): Promise<{
    desglose: DesglosePago;
    tarifas: PagoTarifas;
  }> {
    if (!rutaId?.trim()) {
      throw new BadRequestException('rutaId es requerido');
    }

    const ruta = await this.fetchRutaParaPago(rutaId);
    const tarifas = await this.configuracionPagosService.getTarifas();
    const metricas = this.aggregateMetricas([ruta]);
    const desglose = this.calculatePago(metricas, tarifas);

    return { desglose, tarifas };
  }

  private async fetchRutaParaPago(rutaId: string): Promise<RutaRow> {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas')
      .select(
        `
        id,
        conductor_id,
        origen,
        destino,
        distancia_km,
        bultos_despachados,
        fecha_fin,
        fecha_inicio,
        estado,
        conductores ( id, rut ),
        entregas (
          id,
          bultos_recepcionados,
          fecha_entrega_real,
          validado,
          estado
        )
      `,
      )
      .eq('id', rutaId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Ruta no encontrada');
    }

    return data as RutaRow;
  }

  /**
   * HU-37 CA-08: comparativa de rendimiento entre conductores activos.
   */
  async getComparativaMetricas(
    periodo: PeriodoPago,
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<{
    periodo: RangoPeriodo;
    tarifas: PagoTarifas;
    conductores: ComparativaConductor[];
  }> {
    const rango = this.resolvePeriodRange(periodo, fechaInicio, fechaFin);
    const tarifas = await this.configuracionPagosService.getTarifas();
    const supabase = this.supabaseConfig.getClient();

    const { data: conductoresActivos, error: conductoresError } = await supabase
      .from('conductores')
      .select('id, rut')
      .eq('activo', true);

    if (conductoresError) {
      throw new BadRequestException(
        `Error al obtener conductores: ${conductoresError.message}`,
      );
    }

    const rutas = await this.fetchRutasCompletadas({ rango });
    const porConductor = new Map<string, RutaRow[]>();

    for (const ruta of rutas) {
      if (!ruta.conductor_id) continue;
      const lista = porConductor.get(ruta.conductor_id) ?? [];
      lista.push(ruta);
      porConductor.set(ruta.conductor_id, lista);
    }

    const comparativa: ComparativaConductor[] = (conductoresActivos || []).map(
      (conductor) => {
        const rutasConductor = porConductor.get(conductor.id) ?? [];
        const metricas = this.aggregateMetricas(rutasConductor);
        const desglose = this.calculatePago(metricas, tarifas);
        return {
          conductorId: conductor.id,
          conductorRut: conductor.rut ?? null,
          metricas,
          desglose,
          ranking: 0,
        };
      },
    );

    comparativa.sort((a, b) => b.desglose.montoFinal - a.desglose.montoFinal);
    comparativa.forEach((item, index) => {
      item.ranking = index + 1;
    });

    return { periodo: rango, tarifas, conductores: comparativa };
  }

  private resolvePeriodRange(
    periodo: PeriodoPago,
    fechaInicio?: string,
    fechaFin?: string,
  ): RangoPeriodo {
    const tipo = periodo || 'mensual';
    const hoy = this.startOfDay(new Date());

    if (tipo === 'diario') {
      const iso = this.toDateOnly(hoy);
      return { tipo, fechaInicio: iso, fechaFin: iso };
    }

    if (tipo === 'semanal') {
      const inicio = new Date(hoy);
      const dia = inicio.getDay();
      const diff = dia === 0 ? -6 : 1 - dia;
      inicio.setDate(inicio.getDate() + diff);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);
      return {
        tipo,
        fechaInicio: this.toDateOnly(inicio),
        fechaFin: this.toDateOnly(fin),
      };
    }

    if (tipo === 'mensual') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return {
        tipo,
        fechaInicio: this.toDateOnly(inicio),
        fechaFin: this.toDateOnly(fin),
      };
    }

    if (tipo === 'rango') {
      if (!fechaInicio?.trim() || !fechaFin?.trim()) {
        throw new BadRequestException(
          'Para periodo=rango debe enviar fechaInicio y fechaFin (YYYY-MM-DD)',
        );
      }
      const inicio = this.parseDateOnly(fechaInicio.trim());
      const fin = this.parseDateOnly(fechaFin.trim());
      if (inicio > fin) {
        throw new BadRequestException('fechaInicio no puede ser posterior a fechaFin');
      }
      return {
        tipo,
        fechaInicio: this.toDateOnly(inicio),
        fechaFin: this.toDateOnly(fin),
      };
    }

    throw new BadRequestException(
      'periodo inválido. Valores: diario, semanal, mensual, rango',
    );
  }

  private async fetchRutasCompletadas(options: {
    conductorId?: string;
    rango: RangoPeriodo;
  }): Promise<RutaRow[]> {
    const supabase = this.supabaseConfig.getClient();
    let query = supabase
      .from('rutas')
      .select(
        `
        id,
        conductor_id,
        origen,
        destino,
        distancia_km,
        bultos_despachados,
        fecha_fin,
        fecha_inicio,
        estado,
        conductores ( id, rut ),
        entregas (
          id,
          bultos_recepcionados,
          fecha_entrega_real,
          validado,
          estado
        )
      `,
      )
      .eq('estado', ESTADO_RUTA_COMPLETADA);

    if (options.conductorId) {
      query = query.eq('conductor_id', options.conductorId);
    } else {
      query = query.not('conductor_id', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Error al consultar rutas: ${error.message}`);
    }

    const inicio = this.parseDateOnly(options.rango.fechaInicio);
    const fin = this.endOfDay(this.parseDateOnly(options.rango.fechaFin));

    return (data as RutaRow[] | null ?? []).filter((ruta) => {
      const fechaRef = this.resolveFechaCompletado(ruta);
      if (!fechaRef) return false;
      const fecha = new Date(fechaRef);
      return fecha >= inicio && fecha <= fin;
    });
  }

  private aggregateMetricas(rutas: RutaRow[]): MetricasOperacionales {
    let entregasRealizadas = 0;
    let bultosEntregados = 0;
    let kilometrosRecorridos = 0;

    for (const ruta of rutas) {
      const entregas = this.normalizeEntregas(ruta.entregas);
      const entregasValidas = entregas.filter((e) => this.esEntregaRealizada(e));

      entregasRealizadas += entregasValidas.length > 0 ? entregasValidas.length : 1;

      const bultosRuta = entregasValidas.reduce((sum, entrega) => {
        const bultos =
          entrega.bultos_recepcionados ?? ruta.bultos_despachados ?? 0;
        return sum + Math.max(0, Number(bultos) || 0);
      }, 0);

      if (entregasValidas.length === 0) {
        bultosEntregados += Math.max(0, Number(ruta.bultos_despachados) || 0);
      } else {
        bultosEntregados += bultosRuta;
      }

      const km = Number(ruta.distancia_km);
      if (Number.isFinite(km) && km > 0) {
        kilometrosRecorridos += km;
      }
    }

    return {
      rutasCompletadas: rutas.length,
      entregasRealizadas,
      bultosEntregados: Math.round(bultosEntregados),
      kilometrosRecorridos: Math.round(kilometrosRecorridos * 100) / 100,
    };
  }

  private calculatePago(
    metricas: MetricasOperacionales,
    tarifas: PagoTarifas,
  ): DesglosePago {
    const montoPorRutas = metricas.rutasCompletadas * tarifas.precioPorRuta;
    const montoPorEntregas = metricas.entregasRealizadas * tarifas.precioPorEntrega;
    const montoPorBultos = metricas.bultosEntregados * tarifas.precioPorBulto;
    const montoPorKilometros =
      metricas.kilometrosRecorridos * tarifas.precioPorKm;

    const montoFinal =
      montoPorRutas + montoPorEntregas + montoPorBultos + montoPorKilometros;

    return {
      totalRutas: metricas.rutasCompletadas,
      totalEntregas: metricas.entregasRealizadas,
      totalBultos: metricas.bultosEntregados,
      totalKilometros: metricas.kilometrosRecorridos,
      precioUnitarioRuta: tarifas.precioPorRuta,
      precioUnitarioEntrega: tarifas.precioPorEntrega,
      precioUnitarioBulto: tarifas.precioPorBulto,
      precioUnitarioKm: tarifas.precioPorKm,
      montoPorRutas,
      montoPorEntregas,
      montoPorBultos,
      montoPorKilometros,
      montoFinal: Math.round(montoFinal),
    };
  }

  private toRutaResumen(ruta: RutaRow): RutaCompletadaResumen {
    const entregas = this.normalizeEntregas(ruta.entregas);
    const entregasValidas = entregas.filter((e) => this.esEntregaRealizada(e));
    const bultos =
      entregasValidas.reduce(
        (sum, e) => sum + Math.max(0, Number(e.bultos_recepcionados) || 0),
        0,
      ) || Math.max(0, Number(ruta.bultos_despachados) || 0);

    return {
      id: ruta.id,
      origen: ruta.origen,
      destino: ruta.destino,
      fechaCompletado: this.resolveFechaCompletado(ruta),
      distanciaKm: Number.isFinite(Number(ruta.distancia_km))
        ? Number(ruta.distancia_km)
        : 0,
      bultosEntregados: bultos,
      entregasEnRuta: entregasValidas.length > 0 ? entregasValidas.length : 1,
    };
  }

  private normalizeEntregas(entregas: RutaRow['entregas']): EntregaRow[] {
    if (!entregas) return [];
    return Array.isArray(entregas) ? entregas : [entregas];
  }

  private esEntregaRealizada(entrega: EntregaRow): boolean {
    if (entrega.validado === true) return true;
    const estado = String(entrega.estado || '').toUpperCase();
    return estado === 'ENTREGADA';
  }

  private resolveFechaCompletado(ruta: RutaRow): string | null {
    if (ruta.fecha_fin) return ruta.fecha_fin;

    const entregas = this.normalizeEntregas(ruta.entregas);
    const conFecha = entregas
      .map((e) => e.fecha_entrega_real)
      .filter(Boolean) as string[];
    if (conFecha.length > 0) {
      return conFecha.sort().reverse()[0];
    }

    return ruta.fecha_inicio ?? null;
  }

  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException(
        `Fecha inválida "${value}". Use formato YYYY-MM-DD`,
      );
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  private toDateOnly(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
