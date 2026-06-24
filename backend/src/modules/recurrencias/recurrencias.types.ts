import type { FrecuenciaRecurrencia } from './recurrencias-date.helper';

export type RecurrenciaEstado = 'activa' | 'pausada' | 'cancelada';

export interface ConfiguracionLogisticaSnapshot {
  origen: string;
  destino: string;
  nombre_ruta?: string | null;
  distancia_km?: number | null;
  bultos_despachados?: number | null;
  conductor_id?: string | null;
  camion_id?: string | null;
  observaciones?: string | null;
  ruta_plantilla_id?: string | null;
  paradas?: Array<{
    direccion: string;
    orden: number;
    latitud?: number | null;
    longitud?: number | null;
    es_temporal?: boolean;
  }>;
}

export interface RecurrenciaDto {
  id: string;
  clienteId: string;
  clienteNombre?: string | null;
  rutaPlantillaId?: string | null;
  plantillaNombre?: string | null;
  rutaOrigenId?: string | null;
  creadoPorUsuarioId?: string | null;
  creadoPorRol: string;
  frecuencia: FrecuenciaRecurrencia;
  intervalo: number;
  diaSemana?: number | null;
  diaMes?: number | null;
  horaEjecucion: string;
  zonaHoraria: string;
  fechaInicio: string;
  fechaFin?: string | null;
  proximaEjecucion: string;
  ultimaEjecucion?: string | null;
  estado: RecurrenciaEstado;
  configuracionLogistica: ConfiguracionLogisticaSnapshot;
  proximasFechas?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenciaEjecucionDto {
  id: string;
  recurrenciaId: string;
  rutaGeneradaId?: string | null;
  programadaPara: string;
  ejecutadaEn: string;
  estado: string;
  detalleError?: string | null;
}
