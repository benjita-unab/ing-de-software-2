import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import type {
  PortalPedidoDetalleResponseDto,
  PortalPedidoListResponseDto,
} from './dto/portal-pedido.dto';
import { PortalService } from './portal.service';

@Controller('api/portal')
@UseGuards(JwtGuard, RolesGuard)
@Roles('CLIENTE')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * GET /api/portal/pedidos
   * Lista pedidos del cliente autenticado (scope: JWT clienteId únicamente).
   */
  @Get('pedidos')
  async listPedidos(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortalPedidoListResponseDto> {
    const clienteId = this.requireClienteId(user);
    return this.portalService.listPedidos(clienteId);
  }

  /**
   * GET /api/portal/pedidos/:id
   * Detalle de pedido con historial, entrega y guías (ownership por cliente_id).
   */
  @Get('pedidos/:id')
  async getPedidoById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortalPedidoDetalleResponseDto> {
    const clienteId = this.requireClienteId(user);
    return this.portalService.getPedidoById(id, clienteId);
  }

  private requireClienteId(user: AuthenticatedUser): string {
    const clienteId = user?.clienteId?.trim();
    if (!clienteId) {
      throw new ForbiddenException(
        'Sesión de portal sin cliente vinculado. Vuelve a iniciar sesión.',
      );
    }
    return clienteId;
  }
}
