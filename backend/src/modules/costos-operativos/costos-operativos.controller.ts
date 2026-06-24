import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { CostosOperativosService } from './costos-operativos.service';
import { UpdateCostosOperativosDto } from './dto/update-costos-operativos.dto';

/** HU-50 — Costos operativos por pedido/ruta. */
@Controller('api/rutas/:rutaId/costos-operativos')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR')
export class CostosOperativosController {
  constructor(private readonly costosOperativosService: CostosOperativosService) {}

  @Get()
  getByRuta(@Param('rutaId') rutaId: string) {
    return this.costosOperativosService.getByRutaId(rutaId);
  }

  @Put()
  guardar(
    @Param('rutaId') rutaId: string,
    @Body() body: UpdateCostosOperativosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costosOperativosService.guardar(rutaId, body, user.id);
  }

  @Post('congelar')
  congelar(
    @Param('rutaId') rutaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.costosOperativosService.congelarPorRuta(rutaId, user.id);
  }
}
