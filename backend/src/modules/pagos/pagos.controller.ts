import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get('cliente/:clienteId')
  async getPagosByCliente(@Param('clienteId') clienteId: string) {
    return this.pagosService.getPagosByCliente(clienteId);
  }

  @Get('cliente/:clienteId/pendientes')
  async getRutasPendientesDeCobro(@Param('clienteId') clienteId: string) {
    return this.pagosService.getRutasPendientesDeCobro(clienteId);
  }

  @Post('generar')
  async generarPago(@Body() data: { cliente_id: string; rutas_ids: string[]; monto_total: number }) {
    return this.pagosService.generarPago(data);
  }

  @Patch(':id/estado')
  async marcarPagoComo(@Param('id') pagoId: string, @Body() data: { estado: string }) {
    return this.pagosService.marcarPagoComo(pagoId, data.estado);
  }
}
