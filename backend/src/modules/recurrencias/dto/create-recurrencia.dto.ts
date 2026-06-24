import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateRecurrenciaDto {
  @IsUUID()
  cliente_id: string;

  @IsOptional()
  @IsUUID()
  ruta_plantilla_id?: string | null;

  @IsOptional()
  @IsUUID()
  ruta_origen_id?: string | null;

  @IsIn(['diaria', 'semanal', 'mensual'])
  frecuencia: 'diaria' | 'semanal' | 'mensual';

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalo?: number;

  /** Semanal: 1=lunes … 7=domingo */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana?: number | null;

  /** Mensual: 1–31 (recomendado 1–28) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dia_mes?: number | null;

  @IsOptional()
  @IsString()
  hora_ejecucion?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string | null;
}
