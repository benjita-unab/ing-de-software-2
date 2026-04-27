import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Get()
  @UseGuards(JwtGuard)
  async listIncidencias() {
    return await this.incidenciasService.listIncidencias();
  }

  @Patch(':id/acknowledge')
  @UseGuards(JwtGuard)
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
  @UseGuards(JwtGuard)
  async resolveIncidencia(@Param('id') incidenciaId: string) {
    return await this.incidenciasService.resolveIncidencia(incidenciaId);
  }
}
