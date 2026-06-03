import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { RutasModule } from '../rutas/rutas.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [RutasModule],
  providers: [PortalService, SupabaseConfigService],
  controllers: [PortalController],
})
export class PortalModule {}
