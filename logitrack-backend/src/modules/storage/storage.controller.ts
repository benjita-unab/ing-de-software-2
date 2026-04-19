import { Request, Response, NextFunction } from 'express';
import { uploadFileToStorage } from './storage.service';
import { HttpError } from '../../middleware/errorHandler';

/**
 * POST /api/storage/upload
 * Recibe multipart/form-data con campo "file".
 * Retorna la URL pública del archivo subido a Supabase Storage.
 *
 * Query param opcional: ?folder=fotos|firmas  (default: 'uploads')
 */
export async function uploadFileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new HttpError(400, 'No file attached. Use multipart/form-data with field name "file".');
    }

    const folder = typeof req.query.folder === 'string' ? req.query.folder : 'uploads';
    const result = await uploadFileToStorage(req.file, folder);

    res.status(201).json({
      message: 'File uploaded successfully',
      publicUrl: result.publicUrl,
      path: result.path,
    });
  } catch (err) {
    next(err);
  }
}
