import { Module } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { CamionesController } from './camiones.controller';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [CamionesService, SupabaseConfigService],
  controllers: [CamionesController],
  exports: [CamionesService],
})
export class CamionesModule {}
