import { Controller, Get, UseGuards } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/camiones')
export class CamionesController {
  constructor(private camionesService: CamionesService) {}

  /**
   * GET /api/camiones
   * Lista todos los camiones activos (con su estado real).
   */
  @Get()
  @UseGuards(JwtGuard)
  async list() {
    return await this.camionesService.listCamiones();
  }

  /**
   * GET /api/camiones/disponibles
   * Lista solo camiones DISPONIBLES (útil para asignación de rutas).
   */
  @Get('disponibles')
  @UseGuards(JwtGuard)
  async listDisponibles() {
    return await this.camionesService.listCamionesDisponibles();
  }
}
