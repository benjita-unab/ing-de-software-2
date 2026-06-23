import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { CreateRecurrenciaDto } from './dto/create-recurrencia.dto';
import { RecurrenciasService } from './recurrencias.service';

/** HU-47 — Gestión de recurrencias de pedidos (panel operador). */
@Controller('api/recurrencias')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR')
export class RecurrenciasController {
  constructor(private readonly recurrenciasService: RecurrenciasService) {}

  @Post()
  create(
    @Body() body: CreateRecurrenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.create(body, user);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: string,
    @Query('incluirProximas') incluirProximas?: string,
  ) {
    return this.recurrenciasService.list(
      {
        clienteId,
        estado,
        incluirProximas: incluirProximas === 'true',
      },
      user,
    );
  }

  @Get('proximos')
  listProximos(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clienteId') clienteId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recurrenciasService.listProximos(
      user,
      clienteId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recurrenciasService.getById(id, user);
  }

  @Get(':id/ejecuciones')
  listEjecuciones(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.listEjecuciones(id, user);
  }

  @Patch(':id/pausar')
  pausar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recurrenciasService.pausar(id, user);
  }

  @Patch(':id/reanudar')
  reanudar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recurrenciasService.reanudar(id, user);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recurrenciasService.cancelar(id, user);
  }
}
