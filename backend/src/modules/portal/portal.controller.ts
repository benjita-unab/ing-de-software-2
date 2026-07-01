import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
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
import type { CreateRutaDto } from '../rutas/dto/create-ruta.dto';
import { RecurrenciasService } from '../recurrencias/recurrencias.service';
import { CreateRecurrenciaDto } from '../recurrencias/dto/create-recurrencia.dto';

@Controller('api/portal')
@UseGuards(JwtGuard, RolesGuard)
@Roles('CLIENTE')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly recurrenciasService: RecurrenciasService,
  ) {}

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
   * GET /api/portal/pedidos/:id/evidencias
   * PDFs, fotos y firma del pedido (solo si pertenece al cliente del JWT).
   */
  @Get('pedidos/:id/evidencias')
  async getPedidoEvidencias(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const clienteId = this.requireClienteId(user);
    return this.portalService.getPedidoEvidencias(id, clienteId);
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

  @Post('pedidos')
  async createPedido(
    @Body() body: Omit<CreateRutaDto, 'cliente_id'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const clienteId = this.requireClienteId(user);
    return this.portalService.createPedido(clienteId, body);
  }

  /** HU-47: listar recurrencias del cliente autenticado */
  @Get('recurrencias')
  listRecurrencias(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
  ) {
    return this.recurrenciasService.list(
      { estado, incluirProximas: true },
      user,
    );
  }

  /** HU-47: próximos pedidos programados */
  @Get('recurrencias/proximos')
  listRecurrenciasProximas(@CurrentUser() user: AuthenticatedUser) {
    return this.recurrenciasService.listProximos(user);
  }

  @Post('recurrencias')
  createRecurrencia(
    @Body() body: CreateRecurrenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const clienteId = this.requireClienteId(user);
    return this.recurrenciasService.create(
      { ...body, cliente_id: clienteId },
      user,
    );
  }

  @Patch('recurrencias/:id/pausar')
  pausarRecurrencia(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.pausar(id, user);
  }

  @Patch('recurrencias/:id/reanudar')
  reanudarRecurrencia(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.reanudar(id, user);
  }

  @Patch('recurrencias/:id/cancelar')
  cancelarRecurrencia(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.cancelar(id, user);
  }

  @Get('recurrencias/:id/ejecuciones')
  listEjecucionesRecurrencia(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recurrenciasService.listEjecuciones(id, user);
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
