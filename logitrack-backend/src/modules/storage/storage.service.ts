import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { config } from '../../config';
import { HttpError } from '../../middleware/errorHandler';

export interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Sube un archivo (Buffer) a Supabase Storage y devuelve la URL pública.
 *
 * @param file    - El objeto multer con buffer y mimetype
 * @param folder  - Subcarpeta dentro del bucket, ej. 'fotos' o 'firmas'
 * @returns       - URL pública del archivo en el CDN de Supabase
 */
export async function uploadFileToStorage(
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  // Generamos un path único para evitar colisiones
  const timestamp = Date.now();
  const ext = file.originalname.split('.').pop() ?? 'jpg';
  const storagePath = `${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new HttpError(502, 'Failed to upload file to storage', error.message);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(config.supabase.storageBucket)
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    path: storagePath,
  };
}
