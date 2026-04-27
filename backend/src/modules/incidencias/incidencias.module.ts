import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [IncidenciasService, SupabaseConfigService],
  controllers: [IncidenciasController],
  exports: [IncidenciasService],
})
export class IncidenciasModule {}
