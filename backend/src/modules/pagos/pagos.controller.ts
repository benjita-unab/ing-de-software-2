import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { PagosService } from './pagos.service';

@Controller('api/pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('crear-cobro')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN', 'OPERADOR')
  async crearCobro(
    @Body() body: { rutaId: string; tipo?: 'base' | 'atraso' },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.rutaId) {
      return { error: 'Faltan parámetros requeridos (rutaId)' };
    }
    return this.pagosService.crearCobro(body.rutaId, body.tipo || 'base', user);
  }

  @Get('transbank-return')
  @Redirect()
  async transbankReturnGet(@Query('token_ws') tokenWs: string, @Query('TBK_TOKEN') tbkToken: string, @Query('TBK_ORDEN_COMPRA') tbkOrdenCompra: string) {
    return this.handleTransbankReturn(tokenWs, tbkToken);
  }

  @Post('transbank-return')
  @Redirect()
  async transbankReturnPost(@Body('token_ws') tokenWs: string, @Body('TBK_TOKEN') tbkToken: string, @Body('TBK_ORDEN_COMPRA') tbkOrdenCompra: string) {
    return this.handleTransbankReturn(tokenWs, tbkToken);
  }

  private async handleTransbankReturn(tokenWs: string, tbkToken: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Si viene TBK_TOKEN en vez de token_ws, significa que el usuario anuló el pago
    if (tbkToken && !tokenWs) {
      return { url: `${frontendUrl}/cliente?payment_result=failed&reason=aborted` };
    }

    if (!tokenWs) {
      return { url: `${frontendUrl}/cliente?payment_result=failed&reason=missing_token` };
    }

    try {
      const result = await this.pagosService.confirmarTransaccion(tokenWs);
      if (result.success) {
        return { url: `${frontendUrl}/cliente?payment_result=success&ruta_id=${result.rutaId}` };
      } else {
        return { url: `${frontendUrl}/cliente?payment_result=failed&ruta_id=${result.rutaId || ''}&reason=rejected` };
      }
    } catch (error) {
      return { url: `${frontendUrl}/cliente?payment_result=failed&reason=error` };
    }
  }

  @Get('comprobante/:rutaId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN', 'OPERADOR')
  async getComprobante(
    @Param('rutaId') rutaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pagosService.obtenerComprobante(rutaId, user);
  }
}
