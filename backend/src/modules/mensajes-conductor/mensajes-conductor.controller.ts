import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MensajesConductorService } from './mensajes-conductor.service';

@Controller('api/mensajes-conductor')
@UseGuards(JwtGuard, RolesGuard)
export class MensajesConductorController {
  constructor(private readonly mensajesConductorService: MensajesConductorService) {}

  @Post()
  @Roles('CONDUCTOR')
  async createOrUpdateMensaje(@Body() body: any) {
    return await this.mensajesConductorService.createOrUpdateMensaje(body);
  }

  @Get()
  @Roles('ADMIN', 'OPERADOR')
  async listMensajes(
    @Query('ruta_id') rutaId?: string,
    @Query('prioridad') prioridad?: string,
    @Query('acknowledged') acknowledged?: string,
  ) {
    return await this.mensajesConductorService.listMensajes({
      ruta_id: rutaId,
      prioridad,
      acknowledged,
    });
  }

  @Patch(':id/acknowledge')
  @Roles('ADMIN', 'OPERADOR')
  async acknowledgeMensaje(
    @Param('id') mensajeId: string,
    @Body() body: { operatorId?: string },
  ) {
    return await this.mensajesConductorService.acknowledgeMensaje(
      mensajeId,
      body?.operatorId,
    );
  }
}
