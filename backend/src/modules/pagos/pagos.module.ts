import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  controllers: [PagosController],
  providers: [PagosService, SupabaseConfigService],
})
export class PagosModule {}
