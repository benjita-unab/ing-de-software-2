import { IsIn, IsOptional, IsString } from 'class-validator';

export type EstadoPagoCliente = 'PENDIENTE' | 'PROCESANDO' | 'PAGADO';

export class UpdateEstadoPagoDto {
  @IsIn(['PENDIENTE', 'PROCESANDO', 'PAGADO'])
  estado: EstadoPagoCliente;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  proveedorPago?: string;

  /** Referencia Transbank (buy_order / token); uso futuro en callback. */
  @IsOptional()
  @IsString()
  referenciaTransaccion?: string;
}
