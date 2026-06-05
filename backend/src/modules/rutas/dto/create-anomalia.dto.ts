import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAnomaliaDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsDefined()
  @Type(() => Boolean)
  @IsBoolean()
  es_prioritario: boolean;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsString()
  foto_url?: string;
}
