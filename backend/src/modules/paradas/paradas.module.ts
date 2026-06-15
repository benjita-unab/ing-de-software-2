import { Module } from '@nestjs/common';
import { ParadasService } from './paradas.service';
import { ParadasController } from './paradas.controller';
import { SupabaseConfigService } from '../../config/supabase.config';

/**
 * HU-61 — Módulo de gestión de paradas intermedias.
 * Se registra de forma aditiva en AppModule sin afectar módulos existentes.
 */
@Module({
  providers: [ParadasService, SupabaseConfigService],
  controllers: [ParadasController],
  exports: [ParadasService],
})
export class ParadasModule {}
