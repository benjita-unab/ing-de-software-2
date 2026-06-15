import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CalcularRutaParadaDto {
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsInt()
  @Min(1)
  orden: number;
}

export class CalcularRutaPlantillaDto {
  @IsString()
  @IsNotEmpty()
  origen: string;

  @IsString()
  @IsNotEmpty()
  destino: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalcularRutaParadaDto)
  paradas?: CalcularRutaParadaDto[];
}
