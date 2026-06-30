import {
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

/** HU-50: ajustes manuales antes de guardar/congelar costos operativos. */
export class UpdateCostosOperativosDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  km_l_override?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distancia_km?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_peajes?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempo_espera_minutos?: number | null;
}
