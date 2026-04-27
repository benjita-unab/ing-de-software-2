import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { TrazabilidadController } from './trazabilidad.controller';
import { TrazabilidadService } from './trazabilidad.service';

@Module({
  controllers: [TrazabilidadController],
  providers: [TrazabilidadService, SupabaseConfigService],
})
export class TrazabilidadModule {}
