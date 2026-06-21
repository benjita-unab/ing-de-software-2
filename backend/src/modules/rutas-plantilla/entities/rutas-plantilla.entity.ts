/**
 * Entidades de dominio HU-57 (Supabase / PostgreSQL).
 * El proyecto usa Supabase JS en lugar de TypeORM; estas interfaces
 * documentan el esquema y tipan el mapeo en el servicio.
 */

export interface RutasPlantillaEntity {
  id: string;
  nombre: string;
  origen: string;
  destino: string;
  distancia_estimada: number | string | null;
  tiempo_estimado: number | null;
  origen_lat?: number | null;
  origen_lng?: number | null;
  destino_lat?: number | null;
  destino_lng?: number | null;
  activa: boolean;
  cliente_id?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface RutasPlantillaParadaEntity {
  id: string;
  ruta_id: string;
  direccion: string;
  orden: number;
  latitud?: number | null;
  longitud?: number | null;
  fecha_creacion: string;
}
