/**
 * signatures.controller.ts
 *
 * POST /api/signatures
 * Body JSON: { base64: string, rutaId?: string }
 *
 * Responde: { success: true, data: { publicUrl: string } }
 */

import { Request, Response, NextFunction } from 'express';
import { uploadSignature } from './signatures.service';
import { HttpError } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { logger } from '../../utils/logger';

const LOG = 'Signatures.Controller';

export async function uploadSignatureController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { base64, rutaId } = req.body as { base64?: unknown; rutaId?: unknown };

    if (!base64 || typeof base64 !== 'string' || base64.trim() === '') {
      throw new HttpError(400, 'Campo obligatorio: base64 (string con la firma en base64)');
    }

    const rid = typeof rutaId === 'string' && rutaId.trim() !== '' ? rutaId.trim() : undefined;

    logger.info(LOG, `Solicitud recibida. rutaId=${rid ?? 'no especificado'}`);

    const result = await uploadSignature(base64, rid);

    res.status(201).json(ok({ publicUrl: result.publicUrl, path: result.path }));
  } catch (err) {
    next(err);
  }
}
