/**
 * dispatch.controller.ts
 *
 * POST /api/dispatch/close
 * Body JSON: { ruta_id: string, firma_url: string }
 *
 * Responde siempre con success: true.
 * Si no hay cliente: incluye warning en la respuesta, nunca lanza error fatal.
 */

import { Request, Response, NextFunction } from 'express';
import { closeDispatch } from './dispatch.service';
import { HttpError } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { logger } from '../../utils/logger';

const LOG = 'Dispatch.Controller';

export async function closeDispatchController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ruta_id, firma_url } = req.body as {
      ruta_id?: unknown;
      firma_url?: unknown;
    };

    if (!ruta_id || typeof ruta_id !== 'string' || ruta_id.trim() === '') {
      throw new HttpError(400, 'Campo obligatorio: ruta_id');
    }
    if (!firma_url || typeof firma_url !== 'string' || firma_url.trim() === '') {
      throw new HttpError(400, 'Campo obligatorio: firma_url');
    }

    logger.info(LOG, `Solicitud cierre de despacho. ruta_id=${ruta_id}`);

    const result = await closeDispatch(ruta_id.trim(), firma_url.trim());

    res.status(200).json(
      ok(
        {
          closed: result.closed,
          ruta_id: result.ruta_id,
          entregasActualizadas: result.entregasActualizadas,
        },
        result.warning
      )
    );
  } catch (err) {
    next(err);
  }
}
