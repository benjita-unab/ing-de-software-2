import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardResumenFilters } from './dashboard.service';
import { DashboardFinancieroService } from './dashboard-financiero.service';
import { DashboardRentabilidadService } from './dashboard-rentabilidad.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/dashboard')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardFinancieroService: DashboardFinancieroService,
    private readonly dashboardRentabilidadService: DashboardRentabilidadService,
  ) {}

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

  /**
   * GET /api/dashboard/financiero/resumen
   * KPIs financieros agregados (ingresos, cartera, margen básico).
   * Query opcionales: clienteId, desde (YYYY-MM-DD), hasta (YYYY-MM-DD).
   */
  @Get('financiero/resumen')
  @Roles('ADMIN')
  async getFinancieroResumen(
    @Query('clienteId') clienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return await this.dashboardFinancieroService.getResumen({
      clienteId,
      desde,
      hasta,
    });
  }

  /**
   * GET /api/dashboard/rentabilidad/resumen
   * KPIs de rentabilidad agregados (margen, costos, rutas extremas).
   * Query opcionales: clienteId, desde (YYYY-MM-DD), hasta (YYYY-MM-DD).
   */
  @Get('rentabilidad/resumen')
  @Roles('ADMIN')
  async getRentabilidadResumen(
    @Query('clienteId') clienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return await this.dashboardRentabilidadService.getResumen({
      clienteId,
      desde,
      hasta,
    });
  }
}
