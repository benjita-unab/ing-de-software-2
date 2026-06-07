import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardResumenFilters } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/dashboard')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/resumen
   * KPIs operacionales para el portal del operador (HU-28).
   * Query opcionales: clienteId, estado, desde (YYYY-MM-DD), hasta (YYYY-MM-DD).
   */
  @Get('resumen')
  async getResumen(
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const filters: DashboardResumenFilters = {
      clienteId,
      estado,
      desde,
      hasta,
    };
    return await this.dashboardService.getResumen(filters);
  }

  /**
   * GET /api/dashboard/graficos
   * Datos para gráficos del dashboard operador (HU-28 #246).
   */
  @Get('graficos')
  async getGraficos() {
    return await this.dashboardService.getGraficos();
  }
}
