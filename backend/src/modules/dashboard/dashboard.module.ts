import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardFinancieroService } from './dashboard-financiero.service';
import { DashboardRentabilidadService } from './dashboard-rentabilidad.service';
import { SupabaseConfigService } from '../../config/supabase.config';

@Module({
  providers: [
    DashboardService,
    DashboardFinancieroService,
    DashboardRentabilidadService,
    SupabaseConfigService,
  ],
  controllers: [DashboardController],
  exports: [
    DashboardService,
    DashboardFinancieroService,
    DashboardRentabilidadService,
  ],
})
export class DashboardModule {}
