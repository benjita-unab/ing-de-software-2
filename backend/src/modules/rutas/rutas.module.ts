import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConductoresModule } from '../conductores/conductores.module';

@Module({
  imports: [ConductoresModule],
  providers: [RutasService, SupabaseConfigService],
  controllers: [RutasController],
  exports: [RutasService],
})
export class RutasModule {}
