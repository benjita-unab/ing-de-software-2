/**
 * trazabilidad.service.ts
 *
 * Flujo:
 *  1. Resolver photo_uri — subir base64 a Storage (upsert:true, seguro en reintentos)
 *     o usar la URL ya conocida (syncEngine).
 *  2. Upsert en BD con photo_uri REAL — nunca se escribe un placeholder.
 *     onConflict:'id' + ignoreDuplicates:true: si el id ya existe, la fila
 *     no se modifica y Supabase devuelve null.
 *  3. Detectar INSERT vs conflicto:
 *     data != null -> nuevo registro creado.
 *     data == null -> ya existia, SELECT para retornar la fila existente.
 *
 * Consistencia garantizada:
 *  - La BD jamas recibe un photo_uri vacio o null.
 *  - El upload con upsert:true es idempotente: reintentar el mismo archivo
 *    simplemente lo sobreescribe en Storage sin error.
 *  - Si el upload falla, la BD nunca se toca.
 *  - Si el upsert falla despues del upload, el archivo queda en Storage
 *    (inofensivo) y se logguea la inconsistencia.
 */

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { config } from '../../config';
import { HttpError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const LOG = 'Trazabilidad';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type TraceabilityStage = 'Carga' | 'Transito' | 'Entrega' | 'Devolucion';

export interface CreateTraceabilityEventDto {
  /** UUID generado EN EL FRONTEND — clave de idempotencia (PK). */
  id: string;
  stage: TraceabilityStage;
  /** URL publica ya almacenada (enviada por syncEngine en 2 pasos). */
  photoUri?: string;
  /** Base64 de la imagen — el servicio sube a Storage internamente. */
  fotoBase64?: string;
  latitud: number;
  longitud: number;
  timestamp: string; // ISO 8601
}

export interface TraceabilityEventResult {
  id: string;
  trip_id: string;
  stage: string;
  photo_uri: string;
  latitud: number;
  longitud: number;
  timestamp: string;
  created_at: string;
  alreadyExisted: boolean;
}

// ─── Storage interno (base64 -> Buffer -> Supabase Storage) ──────────────────

async function uploadBase64ToStorage(
  base64: string,
  eventId: string,
  stage: string
): Promise<string> {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  const mimeMatch = base64.match(/^data:image\/(\w+);base64,/);
  const ext = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'jpg';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const buffer = Buffer.from(cleanBase64, 'base64');
  const storagePath = `fotos/${stage.toLowerCase()}/${eventId}.${ext}`;

  logger.info(LOG, `Subiendo foto a Storage: ${storagePath} (${buffer.length} bytes)`);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true, // idempotente: reintentos sobreescriben el mismo archivo sin error
    });

  if (uploadError) {
    logger.error(LOG, 'Fallo upload a Storage', uploadError.message);
    throw new HttpError(502, 'Error al subir foto a Storage', uploadError.message);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .getPublicUrl(storagePath);

  logger.info(LOG, `Foto subida. URL publica: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

// ─── Servicio principal ───────────────────────────────────────────────────────

export async function createTraceabilityEvent(
  dto: CreateTraceabilityEventDto
): Promise<TraceabilityEventResult> {

  // ── 1. Resolver photo_uri real ANTES de tocar la BD ──────────────────────
  // La BD nunca recibe un valor vacio ni null — siempre se escribe la URL definitiva.
  let photoUrl: string;

  if (dto.fotoBase64) {
    // Camino base64: upload a Storage primero, obtener URL publica.
    // Si falla, se lanza error y la BD no se toca.
    logger.info(LOG, `[1] Subiendo imagen a Storage. id=${dto.id}`);
    photoUrl = await uploadBase64ToStorage(dto.fotoBase64, dto.id, dto.stage);
  } else if (dto.photoUri) {
    // Camino syncEngine: la URL ya fue subida en el paso previo del motor.
    photoUrl = dto.photoUri;
    logger.debug(LOG, `[1] Usando photoUri existente: ${photoUrl}`);
  } else {
    throw new HttpError(400, 'Se requiere foto (base64) o photoUri (URL)');
  }

  // ── 2. Upsert atomico con photo_uri real ──────────────────────────────────
  // onConflict:'id'        -> la clave de conflicto es el PK
  // ignoreDuplicates:true  -> en conflicto NO modifica la fila existente
  //
  // Supabase JS v2:
  //   INSERT nuevo  -> devuelve la fila en data
  //   Conflicto     -> devuelve data = null
  logger.info(LOG, `[2] Upsert traceability_events. id=${dto.id}, stage=${dto.stage}`);

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('traceability_events')
    .upsert(
      {
        id:        dto.id,
        trip_id:   dto.id,
        stage:     dto.stage,
        photo_uri: photoUrl,  // siempre la URL real, nunca un placeholder
        latitude:  dto.latitud,
        longitude: dto.longitud,
        timestamp: dto.timestamp,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (upsertError) {
    // Upload ya ocurrio — logguear inconsistencia pero no hay rollback en Storage.
    if (dto.fotoBase64) {
      logger.warn(LOG, `[2] Foto en Storage pero upsert en BD fallo. Inconsistencia. id=${dto.id}`);
    }
    logger.error(LOG, 'Error en upsert', upsertError.message);
    throw new HttpError(502, 'Error al guardar evento de trazabilidad', upsertError.message);
  }

  // ── 3. Determinar INSERT nuevo vs. conflicto idempotente ──────────────────
  if (upserted) {
    logger.info(LOG, `[3] Evento creado. id=${upserted.id}`);
    return mapRow(upserted, false);
  }

  // Conflicto: la fila ya existia — recuperarla para la respuesta.
  logger.info(LOG, `[3] Registro ya existia (idempotente). id=${dto.id}`);

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('traceability_events')
    .select('*')
    .eq('id', dto.id)
    .single();

  if (fetchError || !existing) {
    logger.error(LOG, 'No se pudo recuperar evento existente', fetchError?.message);
    throw new HttpError(502, 'Error al recuperar evento existente', fetchError?.message);
  }

  return mapRow(existing, true);
}

// ─── Helper de mapeo ──────────────────────────────────────────────────────────

function mapRow(
  row: Record<string, unknown>,
  alreadyExisted: boolean
): TraceabilityEventResult {
  return {
    id:            row['id']         as string,
    trip_id:       row['trip_id']    as string,
    stage:         row['stage']      as string,
    photo_uri:     row['photo_uri']  as string,
    latitud:       row['latitude']   as number,
    longitud:      row['longitude']  as number,
    timestamp:     row['timestamp']  as string,
    created_at:    row['created_at'] as string,
    alreadyExisted,
  };
}
