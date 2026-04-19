/**
 * routes.controller.ts
 *
 * GET /api/routes/:id
 *
 * Devuelve datos de la ruta + entregas + cliente (nullable).
 */

import { Request, Response, NextFunction } from 'express';
import { getRouteById } from './routes.service';
import { HttpError } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { logger } from '../../utils/logger';

const LOG = 'Routes.Controller';

export async function getRouteController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;

    if (!id || id.trim() === '') {
      throw new HttpError(400, 'Parámetro obligatorio: id de ruta');
    }

    logger.info(LOG, `Consulta de ruta. id=${id}`);

    const route = await getRouteById(id.trim());

    res.status(200).json(ok(route));
  } catch (err) {
    next(err);
  }
}
