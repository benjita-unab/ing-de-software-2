import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MensajesConductorService } from './mensajes-conductor.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/mensajes-conductor')
export class MensajesConductorController {
  constructor(private readonly mensajesConductorService: MensajesConductorService) {}

  @Post()
  @UseGuards(JwtGuard)
  async createOrUpdateMensaje(@Body() body: any) {
    return await this.mensajesConductorService.createOrUpdateMensaje(body);
  }

  @Get()
  @UseGuards(JwtGuard)
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
  @UseGuards(JwtGuard)
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