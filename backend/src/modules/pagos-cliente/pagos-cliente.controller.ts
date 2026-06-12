import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { UpdateEstadoPagoDto } from './dto/update-estado-pago.dto';
import { PagosClienteService } from './pagos-cliente.service';

/**
 * HU-34 — Consulta y gestión de estado de pagos cliente.
 *
 * Los pagos NO se crean desde este controlador.
 * Origen: creación del pedido (PedidosModule) → PagosClienteService.crearPagoParaPedido()
 */
@Controller('api/pagos-cliente')
@UseGuards(JwtGuard, RolesGuard)
export class PagosClienteController {
  constructor(private readonly pagosClienteService: PagosClienteService) {}

  /** GET /api/pagos-cliente — listado global (admin / operador). */
  @Get()
  @Roles('ADMIN', 'OPERADOR')
  listAll() {
    return this.pagosClienteService.listAll();
  }

  /** GET /api/pagos-cliente/:clienteId — pagos del cliente (portal / operador). */
  @Get(':clienteId')
  @Roles('ADMIN', 'OPERADOR', 'CLIENTE')
  listByCliente(
    @Param('clienteId') clienteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.pagosClienteService.assertClienteAccess(user, clienteId);
    return this.pagosClienteService.listByCliente(clienteId);
  }

  /**
   * PATCH /api/pagos-cliente/:id/estado
   * Cambio manual PENDIENTE | PROCESANDO | PAGADO (pruebas / contingencias).
   */
  @Patch(':id/estado')
  @Roles('ADMIN', 'OPERADOR')
  actualizarEstado(
    @Param('id') id: string,
    @Body() body: UpdateEstadoPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role === 'CLIENTE') {
      throw new ForbiddenException('Los clientes no pueden modificar pagos');
    }
    return this.pagosClienteService.actualizarEstado(id, body, user);
  }
}
