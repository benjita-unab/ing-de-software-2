import { Module } from '@nestjs/common';
import { ConductoresService } from './conductores.service';
import { ConductoresController } from './conductores.controller';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [ConductoresService, SupabaseConfigService],
  controllers: [ConductoresController],
  exports: [ConductoresService],
})
export class ConductoresModule {}
