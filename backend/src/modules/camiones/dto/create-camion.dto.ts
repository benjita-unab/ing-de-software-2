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
  @Min(0.01)
  capacidad_kg: number;

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
