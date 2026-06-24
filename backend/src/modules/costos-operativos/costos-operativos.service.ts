import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConfiguracionPagosService } from '../configuracion-pagos/configuracion-pagos.service';
import { PagoConductoresService } from '../conductores/pago-conductores.service';
import { UpdateCostosOperativosDto } from './dto/update-costos-operativos.dto';

const COSTOS_SELECT = `
  id,
  ruta_id,
  estado,
  camion_id,
  conductor_id,
  distancia_km,
  km_l_camion,
  km_l_override,
  km_l_aplicado,
  consumo_litros_estimado,
  precio_combustible_litro,
  costo_combustible,
  costo_conductor,
  tarifas_conductor,
  desglose_conductor,
  tiempo_espera_minutos,
  precio_espera_minuto,
  costo_espera,
  costo_peajes,
  costo_total,
  congelado_at,
  created_at,
  updated_at
`;

export type CostosOperativosDto = {
  id: string;
  rutaId: string;
  estado: 'borrador' | 'congelado';
  camionId: string | null;
  conductorId: string | null;
  distanciaKm: number;
  kmLCamion: number;
  kmLOverride: number | null;
  kmLAplicado: number;
  consumoLitrosEstimado: number;
  precioCombustibleLitro: number;
  costoCombustible: number;
  costoConductor: number;
  tarifasConductor: Record<string, unknown>;
  desgloseConductor: Record<string, unknown>;
  tiempoEsperaMinutos: number;
  precioEsperaMinuto: number;
  costoEspera: number;
  costoPeajes: number;
  costoTotal: number;
  congeladoAt: string | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
};

@Injectable()
export class CostosOperativosService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly configuracionPagosService: ConfiguracionPagosService,
    private readonly pagoConductoresService: PagoConductoresService,
  ) {}

  async getByRutaId(rutaId: string): Promise<CostosOperativosDto> {
    const existing = await this.fetchByRutaId(rutaId);
    if (existing) {
      return this.mapRow(existing);
    }
    return this.calcularYGuardar(rutaId, {}, null);
  }

  async guardar(
    rutaId: string,
    dto: UpdateCostosOperativosDto,
    userId?: string | null,
  ): Promise<CostosOperativosDto> {
    const existing = await this.fetchByRutaId(rutaId);
    if (existing?.estado === 'congelado') {
      throw new BadRequestException(
        'Los costos operativos están congelados y no pueden modificarse (HU-50 CA-04).',
      );
    }

    const mergedDto: UpdateCostosOperativosDto = {
      ...dto,
      costo_peajes:
        dto.costo_peajes != null
          ? dto.costo_peajes
          : existing
            ? Number(existing.costo_peajes) || 0
            : dto.costo_peajes,
    };

    return this.calcularYGuardar(
      rutaId,
      mergedDto,
      userId ?? null,
      existing ? String(existing.id) : undefined,
    );
  }

  /** Congela la fotografía de costos (manual o al marcar ENTREGADO). */
  async congelarPorRuta(rutaId: string, userId?: string | null): Promise<CostosOperativosDto | null> {
    let row = await this.fetchByRutaId(rutaId);
    if (!row) {
      row = await this.calcularYGuardarRaw(rutaId, {}, userId ?? null);
    }

    if (row.estado === 'congelado') {
      return this.mapRow(row);
    }

    const supabase = this.supabaseConfig.getClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('costos_operativos_ruta')
      .update({
        estado: 'congelado',
        congelado_at: now,
        updated_by: userId ?? null,
      })
      .eq('id', row.id)
      .select(COSTOS_SELECT)
      .single();

    if (error || !data) {
      console.warn('congelarPorRuta omitido:', error?.message);
      return row ? this.mapRow(row) : null;
    }

    return this.mapRow(data);
  }

  private async calcularYGuardar(
    rutaId: string,
    dto: UpdateCostosOperativosDto,
    userId: string | null,
    existingId?: string,
  ): Promise<CostosOperativosDto> {
    const row = await this.calcularYGuardarRaw(rutaId, dto, userId, existingId);
    return this.mapRow(row);
  }

  private async calcularYGuardarRaw(
    rutaId: string,
    dto: UpdateCostosOperativosDto,
    userId: string | null,
    existingId?: string,
  ): Promise<Record<string, unknown>> {
    const supabase = this.supabaseConfig.getClient();

    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select(
        'id, conductor_id, camion_id, distancia_km, tiempo_espera_minutos, bultos_despachados, estado',
      )
      .eq('id', rutaId)
      .single();

    if (rutaError || !ruta) {
      throw new NotFoundException('Ruta/pedido no encontrado');
    }

    if (!ruta.camion_id) {
      throw new BadRequestException(
        'El pedido debe tener un camión asignado para calcular costos operativos.',
      );
    }

    const { data: camion, error: camionError } = await supabase
      .from('camiones')
      .select('id, km_l')
      .eq('id', ruta.camion_id)
      .single();

    if (camionError || !camion) {
      throw new NotFoundException('Camión no encontrado');
    }

    const kmLCamion = Number(camion.km_l);
    if (!Number.isFinite(kmLCamion) || kmLCamion <= 0) {
      throw new BadRequestException(
        'El camión no tiene rendimiento Km/L configurado. Actualícelo en Flota.',
      );
    }

    const config = await this.configuracionPagosService.getConfiguracion();
    const { desglose, tarifas } =
      await this.pagoConductoresService.getDesglosePagoPorRutaId(rutaId);

    const distanciaRaw =
      dto.distancia_km != null
        ? Number(dto.distancia_km)
        : Number(ruta.distancia_km);
    const distanciaKm =
      Number.isFinite(distanciaRaw) && distanciaRaw >= 0 ? distanciaRaw : 0;

    const kmLOverride =
      dto.km_l_override != null && dto.km_l_override !== undefined
        ? Number(dto.km_l_override)
        : null;
    const kmLAplicado =
      kmLOverride != null && Number.isFinite(kmLOverride) && kmLOverride > 0
        ? kmLOverride
        : kmLCamion;

    const consumoLitros =
      kmLAplicado > 0 ? Math.round((distanciaKm / kmLAplicado) * 100) / 100 : 0;

    const precioCombustible = config.precioCombustibleLitro;
    const costoCombustible = Math.round(consumoLitros * precioCombustible);

    const tiempoEspera =
      dto.tiempo_espera_minutos != null
        ? Math.max(0, Math.round(Number(dto.tiempo_espera_minutos)))
        : Math.max(0, Math.round(Number(ruta.tiempo_espera_minutos) || 0));

    const precioEspera = config.precioEsperaMinuto;
    const costoEspera = Math.round(tiempoEspera * precioEspera);

    const costoPeajes =
      dto.costo_peajes != null
        ? Math.max(0, Math.round(Number(dto.costo_peajes)))
        : 0;

    const costoConductor = desglose.montoFinal;
    const costoTotal =
      costoCombustible + costoConductor + costoEspera + costoPeajes;

    const payload = {
      ruta_id: rutaId,
      estado: 'borrador',
      camion_id: ruta.camion_id,
      conductor_id: ruta.conductor_id,
      distancia_km: distanciaKm,
      km_l_camion: kmLCamion,
      km_l_override: kmLOverride,
      km_l_aplicado: kmLAplicado,
      consumo_litros_estimado: consumoLitros,
      precio_combustible_litro: precioCombustible,
      costo_combustible: costoCombustible,
      costo_conductor: costoConductor,
      tarifas_conductor: tarifas,
      desglose_conductor: desglose,
      tiempo_espera_minutos: tiempoEspera,
      precio_espera_minuto: precioEspera,
      costo_espera: costoEspera,
      costo_peajes: costoPeajes,
      costo_total: costoTotal,
      updated_by: userId,
    };

    if (existingId) {
      const existing = await this.fetchByRutaId(rutaId);
      if (existing?.estado === 'congelado') {
        throw new BadRequestException('Costos congelados; no se puede recalcular.');
      }

      const { data, error } = await supabase
        .from('costos_operativos_ruta')
        .update(payload)
        .eq('id', existingId)
        .select(COSTOS_SELECT)
        .single();

      if (error || !data) {
        throw new BadRequestException(
          `No se pudieron actualizar los costos: ${error?.message}`,
        );
      }
      return data;
    }

    const { data, error } = await supabase
      .from('costos_operativos_ruta')
      .insert(payload)
      .select(COSTOS_SELECT)
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `No se pudieron guardar los costos: ${error?.message}`,
      );
    }
    return data;
  }

  private async fetchByRutaId(
    rutaId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('costos_operativos_ruta')
      .select(COSTOS_SELECT)
      .eq('ruta_id', rutaId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Error al consultar costos operativos: ${error.message}`,
      );
    }
    return data ?? null;
  }

  private mapRow(row: Record<string, unknown>): CostosOperativosDto {
    const estado = String(row.estado) as 'borrador' | 'congelado';
    return {
      id: String(row.id),
      rutaId: String(row.ruta_id),
      estado,
      camionId: row.camion_id ? String(row.camion_id) : null,
      conductorId: row.conductor_id ? String(row.conductor_id) : null,
      distanciaKm: Number(row.distancia_km) || 0,
      kmLCamion: Number(row.km_l_camion) || 0,
      kmLOverride:
        row.km_l_override != null ? Number(row.km_l_override) : null,
      kmLAplicado: Number(row.km_l_aplicado) || 0,
      consumoLitrosEstimado: Number(row.consumo_litros_estimado) || 0,
      precioCombustibleLitro: Number(row.precio_combustible_litro) || 0,
      costoCombustible: Number(row.costo_combustible) || 0,
      costoConductor: Number(row.costo_conductor) || 0,
      tarifasConductor: (row.tarifas_conductor as Record<string, unknown>) || {},
      desgloseConductor: (row.desglose_conductor as Record<string, unknown>) || {},
      tiempoEsperaMinutos: Number(row.tiempo_espera_minutos) || 0,
      precioEsperaMinuto: Number(row.precio_espera_minuto) || 0,
      costoEspera: Number(row.costo_espera) || 0,
      costoPeajes: Number(row.costo_peajes) || 0,
      costoTotal: Number(row.costo_total) || 0,
      congeladoAt: row.congelado_at ? String(row.congelado_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      editable: estado !== 'congelado',
    };
  }
}
