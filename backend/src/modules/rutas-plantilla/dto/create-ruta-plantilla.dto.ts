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

export class ParadaPlantillaDto {
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsInt()
  @Min(1)
  orden: number;

  @IsOptional()
  @IsNumber()
  latitud?: number;

  @IsOptional()
  @IsNumber()
  longitud?: number;
}

export class CreateRutaPlantillaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  origen: string;

  @IsString()
  @IsNotEmpty()
  destino: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanciaEstimada?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiempoEstimado?: number;

  @IsOptional()
  @IsNumber()
  origenLat?: number;

  @IsOptional()
  @IsNumber()
  origenLng?: number;

  @IsOptional()
  @IsNumber()
  destinoLat?: number;

  @IsOptional()
  @IsNumber()
  destinoLng?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  /** HU-60: cliente al que pertenece la plantilla (null = global). */
  @IsOptional()
  @IsString()
  clienteId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParadaPlantillaDto)
  paradas?: ParadaPlantillaDto[];
}
