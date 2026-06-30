import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { RutasModule } from '../rutas/rutas.module';
import { RecurrenciasModule } from '../recurrencias/recurrencias.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [RutasModule, RecurrenciasModule],
  providers: [PortalService, SupabaseConfigService],
  controllers: [PortalController],
})
export class PortalModule {}
