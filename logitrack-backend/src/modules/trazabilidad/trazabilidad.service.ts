import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { HttpError } from '../../middleware/errorHandler';

export type TraceabilityStage = 'Carga' | 'Transito' | 'Entrega' | 'Devolucion';

export interface CreateTraceabilityEventDto {
  id: string;                    // UUID del viaje o despacho
  stage: TraceabilityStage;
  photoUri: string;              // URL pública generada por el módulo de Storage
  latitude: number;
  longitude: number;
  timestamp: string;             // ISO 8601
}

export interface TraceabilityEvent extends CreateTraceabilityEventDto {
  created_at: string;
}

/**
 * Inserta un nuevo evento de trazabilidad en Supabase.
 * La tabla esperada en PostgreSQL:
 *
 * CREATE TABLE traceability_events (
 *   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   trip_id     TEXT NOT NULL,
 *   stage       TEXT NOT NULL,
 *   photo_uri   TEXT NOT NULL,
 *   latitude    FLOAT NOT NULL,
 *   longitude   FLOAT NOT NULL,
 *   timestamp   TIMESTAMPTZ NOT NULL,
 *   created_at  TIMESTAMPTZ DEFAULT now()
 * );
 */
export async function createTraceabilityEvent(
  dto: CreateTraceabilityEventDto
): Promise<TraceabilityEvent> {
  const { data, error } = await supabaseAdmin
    .from('traceability_events')
    .insert({
      trip_id: dto.id,
      stage: dto.stage,
      photo_uri: dto.photoUri,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timestamp: dto.timestamp,
    })
    .select()
    .single();

  if (error) {
    throw new HttpError(502, 'Failed to insert traceability event', error.message);
  }

  return {
    id: data.id,
    stage: data.stage,
    photoUri: data.photo_uri,
    latitude: data.latitude,
    longitude: data.longitude,
    timestamp: data.timestamp,
    created_at: data.created_at,
  };
}
