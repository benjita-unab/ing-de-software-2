import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { RutasPlantillaController } from './rutas-plantilla.controller';
import { RutasPlantillaService } from './rutas-plantilla.service';

@Module({
  providers: [RutasPlantillaService, SupabaseConfigService],
  controllers: [RutasPlantillaController],
  exports: [RutasPlantillaService],
})
export class RutasPlantillaModule {}
