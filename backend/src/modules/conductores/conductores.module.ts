import { Module } from '@nestjs/common';
import { ConductoresService } from './conductores.service';
import { ConductoresController } from './conductores.controller';
import { PagoConductoresService } from './pago-conductores.service';
import { ConfiguracionPagosModule } from '../configuracion-pagos/configuracion-pagos.module';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  imports: [ConfiguracionPagosModule],
  providers: [ConductoresService, PagoConductoresService, SupabaseConfigService],
  controllers: [ConductoresController],
  exports: [ConductoresService, PagoConductoresService],
})
export class ConductoresModule {}