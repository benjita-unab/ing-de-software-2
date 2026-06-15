import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParadaPlantillaDto } from './create-ruta-plantilla.dto';

export class UpdateRutaPlantillaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  origen?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  destino?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanciaEstimada?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiempoEstimado?: number | null;

  @IsOptional()
  @IsNumber()
  origenLat?: number | null;

  @IsOptional()
  @IsNumber()
  origenLng?: number | null;

  @IsOptional()
  @IsNumber()
  destinoLat?: number | null;

  @IsOptional()
  @IsNumber()
  destinoLng?: number | null;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  /** Si se envía, reemplaza todas las paradas existentes. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParadaPlantillaDto)
  paradas?: ParadaPlantillaDto[];
}
