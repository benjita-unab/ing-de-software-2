import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import {
  ESTADO_PAGO_OFICIAL,
  EstadoPagoOficial,
  esTransicionPermitida,
  estadoOficialAEspejoRuta,
  normalizarEstadoOficial,
} from './pago-estado.constants';

export type TransicionPagoMetadata = {
  metodoPago?: string | null;
  proveedorPago?: string | null;
  referenciaTransaccion?: string | null;
};

type PagoRow = {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  estado: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  proveedor_pago: string | null;
  referencia_transaccion: string | null;
};

const PAGO_TRANSITION_SELECT = `
  id,
  cliente_id,
  pedido_id,
  estado,
  fecha_pago,
  metodo_pago,
  proveedor_pago,
  referencia_transaccion
`;

/**
 * Único punto de escritura de pagos_cliente.estado.
 * Tras cada cambio válido sincroniza rutas.estado_pago (espejo logístico).
 */
@Injectable()
export class PagoEstadoOrchestrator {
  private readonly logger = new Logger(PagoEstadoOrchestrator.name);

  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async transicionarPorPagoId(
    pagoId: string,
    nuevoEstado: EstadoPagoOficial,
    metadata?: TransicionPagoMetadata,
  ): Promise<PagoRow> {
    if (!pagoId?.trim()) {
      throw new NotFoundException('Pago no encontrado');
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: existing, error: findError } = await supabase
      .from('pagos_cliente')
      .select(PAGO_TRANSITION_SELECT)
      .eq('id', pagoId.trim())
      .maybeSingle();

    if (findError) {
      throw new InternalServerErrorException(
        `Error al buscar el pago: ${findError.message}`,
      );
    }
    if (!existing) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.aplicarTransicion(existing as PagoRow, nuevoEstado, metadata);
  }

  /**
   * Usado por Transbank (pedido_id = ruta.id). Si no hay registro en pagos_cliente, no falla.
   */
  async transicionarPorPedidoId(
    pedidoId: string,
    nuevoEstado: EstadoPagoOficial,
    metadata?: TransicionPagoMetadata,
  ): Promise<PagoRow | null> {
    if (!pedidoId?.trim()) {
      return null;
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: existing, error: findError } = await supabase
      .from('pagos_cliente')
      .select(PAGO_TRANSITION_SELECT)
      .eq('pedido_id', pedidoId.trim())
      .maybeSingle();

    if (findError) {
      this.logger.warn(
        `No se pudo buscar pago para pedido ${pedidoId}: ${findError.message}`,
      );
      return null;
    }
    if (!existing) {
      this.logger.warn(
        `Sin pagos_cliente para pedido ${pedidoId}; se omite transición a ${nuevoEstado}`,
      );
      return null;
    }

    return this.aplicarTransicion(existing as PagoRow, nuevoEstado, metadata);
  }

  /** Sincroniza espejo sin modificar pagos_cliente (p. ej. tras creación en PENDIENTE). */
  async sincronizarEspejoPorPedidoId(
    pedidoId: string,
    estadoOficial: EstadoPagoOficial,
  ): Promise<void> {
    if (!pedidoId?.trim()) return;
    await this.sincronizarEspejoRuta(pedidoId.trim(), estadoOficial);
  }

  private async aplicarTransicion(
    existing: PagoRow,
    nuevoEstado: EstadoPagoOficial,
    metadata?: TransicionPagoMetadata,
  ): Promise<PagoRow> {
    const estadoActual = normalizarEstadoOficial(existing.estado);

    if (!esTransicionPermitida(estadoActual, nuevoEstado)) {
      throw new BadRequestException(
        `Transición de estado no permitida: ${estadoActual} → ${nuevoEstado}`,
      );
    }

    if (estadoActual === nuevoEstado) {
      if (existing.pedido_id) {
        await this.sincronizarEspejoRuta(existing.pedido_id, nuevoEstado);
      }
      return existing;
    }

    const updateRow: Record<string, unknown> = { estado: nuevoEstado };

    if (metadata?.metodoPago !== undefined) {
      updateRow.metodo_pago = metadata.metodoPago?.trim() || null;
    }
    if (metadata?.proveedorPago !== undefined) {
      updateRow.proveedor_pago = metadata.proveedorPago?.trim() || null;
    }
    if (metadata?.referenciaTransaccion !== undefined) {
      updateRow.referencia_transaccion =
        metadata.referenciaTransaccion?.trim() || null;
    }

    if (nuevoEstado === ESTADO_PAGO_OFICIAL.PAGADO) {
      updateRow.fecha_pago = new Date().toISOString();
    } else if (nuevoEstado === ESTADO_PAGO_OFICIAL.PENDIENTE) {
      updateRow.fecha_pago = null;
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: updated, error: updateError } = await supabase
      .from('pagos_cliente')
      .update(updateRow)
      .eq('id', existing.id)
      .select(PAGO_TRANSITION_SELECT)
      .single();

    if (updateError || !updated) {
      throw new InternalServerErrorException(
        `No fue posible actualizar el estado del pago: ${updateError?.message}`,
      );
    }

    if (existing.pedido_id) {
      await this.sincronizarEspejoRuta(existing.pedido_id, nuevoEstado);
    }

    return updated as PagoRow;
  }

  private async sincronizarEspejoRuta(
    pedidoId: string,
    estadoOficial: EstadoPagoOficial,
  ): Promise<void> {
    const espejo = estadoOficialAEspejoRuta(estadoOficial);
    const supabase = this.supabaseConfig.getClient();

    const { error } = await supabase
      .from('rutas')
      .update({ estado_pago: espejo })
      .eq('id', pedidoId);

    if (error) {
      this.logger.error(
        `Error al sincronizar rutas.estado_pago para pedido ${pedidoId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'El pago se actualizó pero falló la sincronización con la ruta',
      );
    }
  }
}
