import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [DashboardService, SupabaseConfigService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
