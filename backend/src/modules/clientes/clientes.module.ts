import { Module } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [ClientesService, SupabaseConfigService],
  controllers: [ClientesController],
  exports: [ClientesService],
})
export class ClientesModule {}
