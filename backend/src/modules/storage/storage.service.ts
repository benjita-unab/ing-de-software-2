import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class StorageService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async uploadFile(
    file: Express.Multer.File,
    bucket: string,
    folder: string,
  ): Promise<{ filePath: string; publicUrl: string; bucket: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('El archivo no contiene datos para subir');
    }

    if (!bucket) {
      throw new BadRequestException('El bucket es requerido');
    }

    if (!folder) {
      throw new BadRequestException('La carpeta es requerida');
    }

    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
    const timestamp = Date.now();
    const originalName = file.originalname?.replace(/\s+/g, '_') || 'file';
    const filePath = `${normalizedFolder}/${timestamp}_${originalName}`;

    await this.supabaseConfig.uploadFile(bucket, filePath, file.buffer, file.mimetype);
    const publicUrl = this.supabaseConfig.getPublicUrl(bucket, filePath);

    return {
      filePath,
      publicUrl,
      bucket,
    };
  }
}
