import { Request, Response, NextFunction } from 'express';
import { createTraceabilityEvent, CreateTraceabilityEventDto } from './trazabilidad.service';
import { HttpError } from '../../middleware/errorHandler';

/**
 * Validación manual simple sin librería externa.
 * Cambiar por Zod o class-validator si se prefiere.
 */
function validatePayload(body: unknown): asserts body is CreateTraceabilityEventDto {
  const b = body as Record<string, unknown>;

  const requiredFields: (keyof CreateTraceabilityEventDto)[] = [
    'id', 'stage', 'photoUri', 'latitude', 'longitude', 'timestamp',
  ];

  for (const field of requiredFields) {
    if (b[field] === undefined || b[field] === null || b[field] === '') {
      throw new HttpError(400, `Missing required field: ${field}`);
    }
  }

  if (typeof b.latitude !== 'number' || typeof b.longitude !== 'number') {
    throw new HttpError(400, 'latitude and longitude must be numbers');
  }

  const validStages = ['Carga', 'Transito', 'Entrega', 'Devolucion'];
  if (!validStages.includes(b.stage as string)) {
    throw new HttpError(
      400,
      `Invalid stage "${b.stage}". Must be one of: ${validStages.join(', ')}`
    );
  }
}

/**
 * POST /api/trazabilidad
 * Body JSON:
 * {
 *   "id": "uuid-del-viaje",
 *   "stage": "Carga" | "Transito" | "Entrega" | "Devolucion",
 *   "photoUri": "https://...",
 *   "latitude": -33.4489,
 *   "longitude": -70.6693,
 *   "timestamp": "2026-04-14T12:00:00Z"
 * }
 */
export async function createEventController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    validatePayload(req.body);

    const event = await createTraceabilityEvent(req.body);

    res.status(201).json({
      message: 'Traceability event created',
      event,
    });
  } catch (err) {
    next(err);
  }
}
