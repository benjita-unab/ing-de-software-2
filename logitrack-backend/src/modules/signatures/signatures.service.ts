/**
 * signatures.service.ts
 *
 * Recibe una firma en base64, la sube a Supabase Storage (carpeta firmas/)
 * y devuelve la URL pública.
 *
 * Formato aceptado del base64:
 *   - Con prefix: "data:image/png;base64,<datos>"
 *   - Sin prefix: "<datos>"
 */

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { config } from '../../config';
import { HttpError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const LOG = 'Signatures';

export interface SignatureUploadResult {
  publicUrl: string;
  path: string;
}

export async function uploadSignature(
  base64: string,
  rutaId?: string
): Promise<SignatureUploadResult> {
  // Extraer parte de datos y determinar extensión
  const mimeMatch = base64.match(/^data:image\/(\w+);base64,/);
  const ext = mimeMatch ? mimeMatch[1].replace('jpeg', 'jpg') : 'png';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  if (!cleanBase64 || cleanBase64.trim() === '') {
    throw new HttpError(400, 'El base64 de la firma está vacío');
  }

  const buffer = Buffer.from(cleanBase64, 'base64');

  if (buffer.length === 0) {
    throw new HttpError(400, 'No se pudo decodificar el base64 de la firma');
  }

  // Path: firmas/<rutaId>-<timestamp>.png  (o firmas/<timestamp>.png si no hay rutaId)
  const suffix = rutaId ? `${rutaId}-${Date.now()}` : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `firmas/${suffix}.${ext}`;

  logger.info(LOG, `Subiendo firma a Storage: ${storagePath} (${buffer.length} bytes)`);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true, // idempotente: un reintento reemplaza el archivo
    });

  if (uploadError) {
    logger.error(LOG, 'Falló upload de firma', uploadError.message);
    throw new HttpError(502, 'Error al subir firma a Storage', uploadError.message);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .getPublicUrl(storagePath);

  logger.info(LOG, `✓ Firma subida. URL: ${urlData.publicUrl}`);

  return {
    publicUrl: urlData.publicUrl,
    path: storagePath,
  };
}
