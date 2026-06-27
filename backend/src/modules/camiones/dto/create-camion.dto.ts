import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const ESTADOS_CAMION = ['DISPONIBLE', 'EN_RUTA', 'MANTENCION'] as const;

export class CreateCamionDto {
  @IsString()
  @IsNotEmpty()
  patente: string;

  @IsNumber()
  @Min(1)
  slots: number;

  /** HU-50: rendimiento Km/L (obligatorio al registrar). */
  @IsNumber()
  @Min(0.01)
  km_l: number;

  @IsOptional()
  @IsIn(ESTADOS_CAMION)
  estado?: (typeof ESTADOS_CAMION)[number];

  @IsOptional()
  @IsDateString()
  ultima_mantencion?: string;

  @IsOptional()
  @IsDateString()
  proxima_mantencion?: string;
}
