import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardFinancieroService } from './dashboard-financiero.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [DashboardService, DashboardFinancieroService, SupabaseConfigService],
  controllers: [DashboardController],
  exports: [DashboardService, DashboardFinancieroService],
})
export class DashboardModule {}
