import { Module } from '@nestjs/common';
import { EntregasService } from './entregas.service';
import { EntregasController } from './entregas.controller';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ResendConfigService } from '../../config/resend.config';

@Module({
  providers: [EntregasService, SupabaseConfigService, ResendConfigService],
  controllers: [EntregasController],
  exports: [EntregasService],
})
export class EntregasModule {}
