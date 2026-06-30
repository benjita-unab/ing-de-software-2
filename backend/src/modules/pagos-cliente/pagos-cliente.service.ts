import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdateEstadoPagoDto } from './dto/update-estado-pago.dto';
import {
  ESTADO_PAGO_OFICIAL,
  normalizarEstadoOficial,
} from './pago-estado.constants';
import { PagoEstadoOrchestrator } from './pago-estado.orchestrator';

export type PagoClienteItemDto = {
  id: string;
  clienteId: string;
  clienteNombre: string | null;
  pedidoId: string | null;
  montoTotal: number;
  montoCalculado: boolean;
  estado: string;
  fechaCreacion: string;
  fechaPago: string | null;
  metodoPago: string | null;
  proveedorPago: string | null;
  referenciaTransaccion: string | null;
};

export type PagosClienteListResponse = {
  data: PagoClienteItemDto[];
  total: number;
  totalAcumulado: number;
  totalPendiente: number;
  totalPagado: number;
  pagosSinMontoCalculado: number;
};

const PAGO_SELECT_FIELDS = `
  id,
  cliente_id,
  pedido_id,
  monto_total,
  monto_calculado,
  estado,
  fecha_creacion,
  fecha_pago,
  metodo_pago,
  proveedor_pago,
  referencia_transaccion,
  clientes(id, nombre)
`;

@Injectable()
export class PagosClienteService {
  constructor(
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly pagoEstadoOrchestrator: PagoEstadoOrchestrator,
  ) {}

  assertClienteAccess(user: AuthenticatedUser, clienteId: string): void {
    if (user.role === 'CLIENTE') {
      const ownId = user.clienteId?.trim();
      if (!ownId || ownId !== clienteId?.trim()) {
        throw new ForbiddenException('No tienes acceso a los pagos de este cliente');
      }
    }
  }

  async listAll(): Promise<PagosClienteListResponse> {
    const supabase = this.supabaseConfig.getClient();

    const { data: pagos, error } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener los pagos: ${error.message}`,
      );
    }

    const items = (pagos || []).map((row) => this.mapPagoRow(row));
    return this.buildListResponse(items);
  }

  async listByCliente(clienteId: string): Promise<PagosClienteListResponse> {
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: pagos, error } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .eq('cliente_id', clienteId.trim())
      .order('fecha_creacion', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No fue posible obtener los pagos del cliente: ${error.message}`,
      );
    }

    const items = (pagos || []).map((row) => this.mapPagoRow(row));
    return this.buildListResponse(items);
  }

  /**
   * Creación programática al originar un pedido.
   * Invocado desde PedidosModule / Portal — NO desde el módulo HTTP de pagos.
   *
   * @integration PedidosModule.createPedido() → crearPagoParaPedido({ clienteId, pedidoId })
   */
  async crearPagoParaPedido(dto: CreatePagoDto): Promise<PagoClienteItemDto> {
    const clienteId = dto.clienteId?.trim();
    if (!clienteId) {
      throw new BadRequestException('clienteId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError || !cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const montoTotal = this.redondearMonto(
      dto.montoTotal !== undefined ? Number(dto.montoTotal) : 0,
    );
    const montoCalculado = dto.montoCalculado === true;

    const { data: pago, error: pagoError } = await supabase
      .from('pagos_cliente')
      .insert({
        cliente_id: clienteId,
        pedido_id: dto.pedidoId?.trim() || null,
        monto_total: montoTotal,
        monto_calculado: montoCalculado,
        estado: ESTADO_PAGO_OFICIAL.PENDIENTE,
        metodo_pago: dto.metodoPago?.trim() || null,
        proveedor_pago: dto.proveedorPago?.trim() || null,
        referencia_transaccion: dto.referenciaTransaccion?.trim() || null,
      })
      .select(PAGO_SELECT_FIELDS)
      .single();

    if (pagoError || !pago) {
      throw new InternalServerErrorException(
        `No fue posible crear el pago: ${pagoError?.message}`,
      );
    }

    const pedidoId = dto.pedidoId?.trim();
    if (pedidoId) {
      await this.pagoEstadoOrchestrator.sincronizarEspejoPorPedidoId(
        pedidoId,
        ESTADO_PAGO_OFICIAL.PENDIENTE,
      );
    }

    return this.mapPagoRow({ ...pago, clientes: { id: cliente.id, nombre: cliente.nombre } });
  }

  /**
   * Actualización de monto tras cálculo de cobro (HU-51).
   * @integration HU-51 → actualizarMontoPedido(pagoId, monto)
   */
  async actualizarMontoPedido(
    pagoId: string,
    montoTotal: number,
  ): Promise<PagoClienteItemDto> {
    if (!pagoId?.trim()) {
      throw new NotFoundException('Pago no encontrado');
    }

    const supabase = this.supabaseConfig.getClient();
    const monto = this.redondearMonto(montoTotal);

    const { data: updated, error } = await supabase
      .from('pagos_cliente')
      .update({
        monto_total: monto,
        monto_calculado: true,
      })
      .eq('id', pagoId.trim())
      .select(PAGO_SELECT_FIELDS)
      .single();

    if (error || !updated) {
      throw new InternalServerErrorException(
        `No fue posible actualizar el monto: ${error?.message}`,
      );
    }

    return this.mapPagoRow(updated);
  }

  async actualizarEstado(
    pagoId: string,
    dto: UpdateEstadoPagoDto,
    user: AuthenticatedUser,
  ): Promise<PagoClienteItemDto> {
    if (!pagoId?.trim()) {
      throw new NotFoundException('Pago no encontrado');
    }

    const estadoNormalizado = normalizarEstadoOficial(dto.estado);

    const supabase = this.supabaseConfig.getClient();
    const { data: existing, error: findError } = await supabase
      .from('pagos_cliente')
      .select('cliente_id')
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

    this.assertClienteAccess(user, existing.cliente_id);

    await this.pagoEstadoOrchestrator.transicionarPorPagoId(
      pagoId.trim(),
      estadoNormalizado,
      {
        metodoPago: dto.metodoPago,
        proveedorPago: dto.proveedorPago,
        referenciaTransaccion: dto.referenciaTransaccion,
      },
    );

    const { data: updated, error: reloadError } = await supabase
      .from('pagos_cliente')
      .select(PAGO_SELECT_FIELDS)
      .eq('id', pagoId.trim())
      .single();

    if (reloadError || !updated) {
      throw new InternalServerErrorException(
        `No fue posible recargar el pago: ${reloadError?.message}`,
      );
    }

    return this.mapPagoRow(updated);
  }

  private mapPagoRow(row: Record<string, unknown>): PagoClienteItemDto {
    const clienteRaw = row.clientes as
      | { id: string; nombre: string | null }
      | { id: string; nombre: string | null }[]
      | null
      | undefined;
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;

    return {
      id: String(row.id),
      clienteId: String(row.cliente_id),
      clienteNombre: cliente?.nombre ?? null,
      pedidoId: row.pedido_id ? String(row.pedido_id) : null,
      montoTotal: this.redondearMonto(Number(row.monto_total ?? 0)),
      montoCalculado: row.monto_calculado === true || row.monto_calculado === 'true',
      estado: normalizarEstadoOficial(String(row.estado ?? ESTADO_PAGO_OFICIAL.PENDIENTE)),
      fechaCreacion: String(row.fecha_creacion),
      fechaPago: row.fecha_pago ? String(row.fecha_pago) : null,
      metodoPago: row.metodo_pago ? String(row.metodo_pago) : null,
      proveedorPago: row.proveedor_pago ? String(row.proveedor_pago) : null,
      referenciaTransaccion: row.referencia_transaccion
        ? String(row.referencia_transaccion)
        : null,
    };
  }

  private redondearMonto(valor: number): number {
    if (!Number.isFinite(valor)) {
      return 0;
    }
    return Number(valor.toFixed(2));
  }

  private sumarMontos(valores: number[]): number {
    return this.redondearMonto(
      valores.reduce((sum, v) => sum + this.redondearMonto(v), 0),
    );
  }

  private montoParaAgregado(pago: PagoClienteItemDto): number {
    return pago.montoCalculado ? pago.montoTotal : 0;
  }

  private buildListResponse(items: PagoClienteItemDto[]): PagosClienteListResponse {
    const totalPendiente = this.sumarMontos(
      items
        .filter(
          (p) =>
            p.estado === ESTADO_PAGO_OFICIAL.PENDIENTE ||
            p.estado === ESTADO_PAGO_OFICIAL.PROCESANDO,
        )
        .map((p) => this.montoParaAgregado(p)),
    );
    const totalPagado = this.sumarMontos(
      items
        .filter((p) => p.estado === ESTADO_PAGO_OFICIAL.PAGADO)
        .map((p) => this.montoParaAgregado(p)),
    );

    return {
      data: items,
      total: items.length,
      totalAcumulado: this.sumarMontos([totalPendiente, totalPagado]),
      totalPendiente,
      totalPagado,
      pagosSinMontoCalculado: items.filter((p) => !p.montoCalculado).length,
    };
  }
}
