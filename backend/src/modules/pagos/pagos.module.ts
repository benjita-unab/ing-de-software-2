import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  imports: [],
  controllers: [PagosController],
  providers: [PagosService, SupabaseConfigService],
  exports: [PagosService],
})
export class PagosModule {}
