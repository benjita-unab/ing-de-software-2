import type {
  RutasPlantillaEntity,
  RutasPlantillaParadaEntity,
} from './entities/rutas-plantilla.entity';

export type RutaPlantillaParadaDto = {
  id: string;
  direccion: string;
  orden: number;
  latitud?: number | null;
  longitud?: number | null;
  fechaCreacion: string;
};

export type RutaPlantillaListItemDto = {
  id: string;
  nombre: string;
  origen: string;
  destino: string;
  distanciaEstimada: number | null;
  tiempoEstimado: number | null;
  origenLat?: number | null;
  origenLng?: number | null;
  destinoLat?: number | null;
  destinoLng?: number | null;
  activa: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  cantidadParadas: number;
  cantidadPedidos: number;
};

export type RutaPlantillaDetalleDto = RutaPlantillaListItemDto & {
  paradas: RutaPlantillaParadaDto[];
};

export type CalcularRutaPlantillaResult = {
  distanciaEstimada: number;
  tiempoEstimado: number | null;
};

export type RutasPlantillaListResponse = {
  data: RutaPlantillaListItemDto[];
  total: number;
};

type ParadaRow = Pick<
  RutasPlantillaParadaEntity,
  'id' | 'ruta_id' | 'direccion' | 'orden' | 'fecha_creacion'
>;

type PlantillaRow = RutasPlantillaEntity & {
  rutas_plantilla_paradas?: ParadaRow[] | { count: number }[] | null;
};
