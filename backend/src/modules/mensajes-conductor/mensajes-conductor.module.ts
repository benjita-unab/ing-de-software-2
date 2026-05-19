import { Module } from '@nestjs/common';
import { MensajesConductorController } from './mensajes-conductor.controller';
import { MensajesConductorService } from './mensajes-conductor.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  imports: [],
  controllers: [MensajesConductorController],
  providers: [MensajesConductorService, SupabaseConfigService],
  exports: [MensajesConductorService],
})
export class MensajesConductorModule {}