import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConductoresModule } from '../conductores/conductores.module';
import { EmailModule } from '../email/email.module';
import { RutasPlantillaModule } from '../rutas-plantilla/rutas-plantilla.module';
import { PagosClienteModule } from '../pagos-cliente/pagos-cliente.module';
import { ConfiguracionPagosModule } from '../configuracion-pagos/configuracion-pagos.module';
import { CostosOperativosModule } from '../costos-operativos/costos-operativos.module';

@Module({
  imports: [
    ConductoresModule,
    EmailModule,
    RutasPlantillaModule,
    PagosClienteModule,
    ConfiguracionPagosModule,
    CostosOperativosModule,
  ],
  providers: [RutasService, SupabaseConfigService],
  controllers: [RutasController],
  exports: [RutasService],
})
export class RutasModule {}
