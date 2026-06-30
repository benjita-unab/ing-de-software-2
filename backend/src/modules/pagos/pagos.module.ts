import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { SupabaseConfigService } from '../../config/supabase.config';
import { PagosClienteModule } from '../pagos-cliente/pagos-cliente.module';

@Module({
  imports: [PagosClienteModule],
  controllers: [PagosController],
  providers: [PagosService, SupabaseConfigService],
  exports: [PagosService],
})
export class PagosModule {}
