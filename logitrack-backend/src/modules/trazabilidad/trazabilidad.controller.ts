/**
 * trazabilidad.controller.ts
 *
 * Acepta campos en español (etapa, foto, latitud, longitud) Y en inglés
 * (stage, photoUri, latitude, longitude) para ser compatible con:
 *   - el syncEngine existente (que usa campos en inglés)
 *   - llamadas directas con base64 (campos en español)
 *
 * Responde siempre con el contract:
 *   { success, data?, error?, warning? }
 */

import { Request, Response, NextFunction } from 'express';
import { createTraceabilityEvent, TraceabilityStage } from './trazabilidad.service';
import { HttpError } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { logger } from '../../utils/logger';

const LOG = 'Trazabilidad.Controller';

const VALID_STAGES: TraceabilityStage[] = ['Carga', 'Transito', 'Entrega', 'Devolucion'];

/**
 * POST /api/trazabilidad
 *
 * Campos aceptados (español o inglés):
 *   id        — UUID del evento (obligatorio, generado en frontend)
 *   etapa | stage        — etapa de trazabilidad
 *   foto  | fotoBase64   — imagen en base64
 *   photoUri             — URL ya subida (compat. syncEngine)
 *   latitud  | latitude
 *   longitud | longitude
 *   timestamp            — ISO 8601
 */
export async function createEventController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const b = req.body as Record<string, unknown>;

    // ── Normalizar campos (español / inglés) ──────────────────────────────────
    const id        = b.id as string | undefined;
    const stage     = (b.etapa ?? b.stage) as string | undefined;
    const fotoBase64 = (b.foto ?? b.fotoBase64) as string | undefined;
    const photoUri  = b.photoUri as string | undefined;
    const latitud   = Number(b.latitud  ?? b.latitude);
    const longitud  = Number(b.longitud ?? b.longitude);
    const timestamp = b.timestamp as string | undefined;

    // ── Validaciones ──────────────────────────────────────────────────────────
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new HttpError(400, 'Campo obligatorio: id (UUID generado en el frontend)');
    }
    if (!stage) {
      throw new HttpError(400, 'Campo obligatorio: etapa (o stage)');
    }
    if (!VALID_STAGES.includes(stage as TraceabilityStage)) {
      throw new HttpError(
        400,
        `Etapa inválida: "${stage}". Valores aceptados: ${VALID_STAGES.join(', ')}`
      );
    }
    if (!fotoBase64 && !photoUri) {
      throw new HttpError(400, 'Se requiere foto (base64) o photoUri (URL ya subida)');
    }
    if (isNaN(latitud) || isNaN(longitud)) {
      throw new HttpError(400, 'latitud y longitud deben ser números');
    }
    if (!timestamp) {
      throw new HttpError(400, 'Campo obligatorio: timestamp (ISO 8601)');
    }

    logger.info(LOG, `Solicitud recibida. id=${id}, stage=${stage}`);

    const result = await createTraceabilityEvent({
      id: id.trim(),
      stage: stage as TraceabilityStage,
      fotoBase64,
      photoUri,
      latitud,
      longitud,
      timestamp,
    });

    const statusCode = result.alreadyExisted ? 200 : 201;

    res.status(statusCode).json(
      ok(
        { id: result.id, trip_id: result.trip_id },
        result.alreadyExisted ? 'Evento ya registrado (idempotente)' : undefined
      )
    );
  } catch (err) {
    next(err);
  }
}
