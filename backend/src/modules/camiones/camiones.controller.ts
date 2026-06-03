import { Controller, Get, UseGuards } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/camiones')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class CamionesController {
  constructor(private camionesService: CamionesService) {}

  /**
   * GET /api/camiones
   * Lista todos los camiones activos (con su estado real).
   */
  @Get()
  async list() {
    return await this.camionesService.listCamiones();
  }

  /**
   * GET /api/camiones/disponibles
   * Lista solo camiones DISPONIBLES (útil para asignación de rutas).
   */
  @Get('disponibles')
  async listDisponibles() {
    return await this.camionesService.listCamionesDisponibles();
  }
}
