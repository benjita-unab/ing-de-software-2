import { Module } from '@nestjs/common';
import { RutasModule } from '../rutas/rutas.module';
import { RutasPlantillaModule } from '../rutas-plantilla/rutas-plantilla.module';
import { SupabaseConfigService } from '../../config/supabase.config';
import { RecurrenciasController } from './recurrencias.controller';
import { RecurrenciasCronService } from './recurrencias.cron';
import { RecurrenciasService } from './recurrencias.service';

@Module({
  imports: [RutasModule, RutasPlantillaModule],
  providers: [RecurrenciasService, RecurrenciasCronService, SupabaseConfigService],
  controllers: [RecurrenciasController],
  exports: [RecurrenciasService],
})
export class RecurrenciasModule {}
