import { Module } from '@nestjs/common';
import { ConfiguracionPagosController } from './configuracion-pagos.controller';
import { ConfiguracionPagosService } from './configuracion-pagos.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [ConfiguracionPagosService, SupabaseConfigService],
  controllers: [ConfiguracionPagosController],
  exports: [ConfiguracionPagosService],
})
export class ConfiguracionPagosModule {}
