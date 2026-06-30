import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConfiguracionPagosModule } from '../configuracion-pagos/configuracion-pagos.module';
import { ConductoresModule } from '../conductores/conductores.module';
import { CostosOperativosController } from './costos-operativos.controller';
import { CostosOperativosService } from './costos-operativos.service';

@Module({
  imports: [ConfiguracionPagosModule, ConductoresModule],
  providers: [CostosOperativosService, SupabaseConfigService],
  controllers: [CostosOperativosController],
  exports: [CostosOperativosService],
})
export class CostosOperativosModule {}
