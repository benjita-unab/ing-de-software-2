import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
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
   */
  @Get('resumen')
  async getResumen() {
    return await this.dashboardService.getResumen();
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
