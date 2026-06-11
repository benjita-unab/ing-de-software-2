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
 * HU-34 — Módulo de consulta y gestión de pagos cliente.
 *
 * IMPORTANTE: los pagos NO se originan desde este controlador.
 * La creación de pagos (PagosClienteService.crearPago) se invocará desde
 * el flujo de pedido/ruta o portal cliente cuando exista integración Transbank.
 * Este módulo expone listado, detalle y cambio de estado para operador/admin.
 */
@Controller('api/pagos-cliente')
@UseGuards(JwtGuard, RolesGuard)
export class PagosClienteController {
  constructor(private readonly pagosClienteService: PagosClienteService) {}

  /**
   * GET /api/pagos-cliente
   * Lista todos los pagos con cliente, rutas y montos (admin / operador).
   */
  @Get()
  @Roles('ADMIN', 'OPERADOR')
  listAll() {
    return this.pagosClienteService.listAll();
  }

  /**
   * GET /api/pagos-cliente/:clienteId/pendientes
   * Rutas completadas sin pago (uso futuro: checkout al crear pedido).
   */
  @Get(':clienteId/pendientes')
  @Roles('ADMIN', 'OPERADOR', 'CLIENTE')
  listPendientes(
    @Param('clienteId') clienteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.pagosClienteService.assertClienteAccess(user, clienteId);
    return this.pagosClienteService.listPendientes(clienteId);
  }

  /**
   * GET /api/pagos-cliente/:clienteId
   * Pagos de un cliente específico.
   */
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
   * Cambio manual de estado (pruebas / contingencias): PENDIENTE | PROCESANDO | PAGADO.
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
