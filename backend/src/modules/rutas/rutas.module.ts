import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConductoresModule } from '../conductores/conductores.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConductoresModule, EmailModule],
  providers: [RutasService, SupabaseConfigService],
  controllers: [RutasController],
  exports: [RutasService],
})
export class RutasModule {}
