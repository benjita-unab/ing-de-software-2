import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

const ESTADOS_CAMION = ['DISPONIBLE', 'EN_RUTA', 'MANTENCION'] as const;

export class UpdateCamionDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  slots?: number;

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
