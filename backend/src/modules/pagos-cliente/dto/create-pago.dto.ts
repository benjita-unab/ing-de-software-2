import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * DTO interno — creación programática al originar un pedido.
 *
 * Integración futura (PedidosModule / Portal):
 *   PagosClienteService.crearPagoParaPedido(dto)
 *
 * NO se expone por HTTP desde este módulo.
 * HU-51 actualizará monto_total y monto_calculado=true vía actualizarMontoPedido().
 */
export class CreatePagoDto {
  @IsUUID()
  clienteId: string;

  /** ID del pedido operativo. Nullable hasta existir tabla pedidos (HU-50). */
  @IsOptional()
  @IsUUID()
  pedidoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoTotal?: number;

  /** false por defecto hasta que HU-51 calcule el cobro. */
  @IsOptional()
  @IsBoolean()
  montoCalculado?: boolean;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  proveedorPago?: string;

  @IsOptional()
  @IsString()
  referenciaTransaccion?: string;
}
