import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import {
  ConfiguracionPagosService,
  UpdateConfiguracionPagosDto,
} from './configuracion-pagos.service';

@Controller('api/configuracion-pagos')
@UseGuards(JwtGuard, RolesGuard)
export class ConfiguracionPagosController {
  constructor(
    private readonly configuracionPagosService: ConfiguracionPagosService,
  ) {}

  /**
   * GET /api/configuracion-pagos
   * Lectura de tarifas vigentes (solo administrador).
   */
  @Get()
  @Roles('ADMIN')
  async getConfiguracion() {
    return await this.configuracionPagosService.getConfiguracion();
  }

  /**
   * PUT /api/configuracion-pagos
   * Actualiza las 4 tarifas unitarias (solo administrador).
   */
  @Put()
  @Roles('ADMIN')
  async updateConfiguracion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateConfiguracionPagosDto,
  ) {
    return await this.configuracionPagosService.updateConfiguracion(
      body,
      user.id,
    );
  }
}
