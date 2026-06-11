import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO interno para creación programática de pagos.
 * NO se expone vía HTTP en el módulo de pagos: el pago debe originarse
 * desde la creación del pedido/ruta o el checkout del portal cliente (Transbank).
 */
export class CreatePagoDto {
  @IsUUID()
  clienteId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  rutaIds: string[];

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  referenciaTransaccion?: string;
}
