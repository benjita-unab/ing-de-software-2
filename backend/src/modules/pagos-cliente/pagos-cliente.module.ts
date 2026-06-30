/**
 * HU-34 — Pagos cliente B2B (modelo pedido-centrico).
 *
 * Arquitectura:
 *   Ruta   → plantilla (sin relación con pagos)
 *   Pedido → instancia operativa (HU-50, futuro)
 *   Pago   → cobro asociado al pedido
 *
 * PagosClienteService se exporta para:
 *   - PedidosModule.crearPagoParaPedido() al originar pedido
 *   - HU-51.actualizarMontoPedido() para cálculo de cobro
 *   - Transbank callback para actualizar estado/referencia
 *
 * Este módulo HTTP solo expone consulta y cambio de estado manual.
 */
import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { PagosClienteController } from './pagos-cliente.controller';
import { PagosClienteService } from './pagos-cliente.service';
import { PagoEstadoOrchestrator } from './pago-estado.orchestrator';

@Module({
  providers: [PagosClienteService, PagoEstadoOrchestrator, SupabaseConfigService],
  controllers: [PagosClienteController],
  exports: [PagosClienteService, PagoEstadoOrchestrator],
})
export class PagosClienteModule {}
