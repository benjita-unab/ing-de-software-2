import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/incidencias')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Get()
  async listIncidencias() {
    return await this.incidenciasService.listIncidencias();
  }

  @Patch(':id/acknowledge')
  async acknowledgeIncidencia(
    @Param('id') incidenciaId: string,
    @Body() body: { operatorId: string },
  ) {
    return await this.incidenciasService.acknowledgeIncidencia(
      incidenciaId,
      body.operatorId,
    );
  }

  @Patch(':id/resolve')
  async resolveIncidencia(@Param('id') incidenciaId: string) {
    return await this.incidenciasService.resolveIncidencia(incidenciaId);
  }
}
