import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  providers: [PortalService, SupabaseConfigService],
  controllers: [PortalController],
})
export class PortalModule {}
