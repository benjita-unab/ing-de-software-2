import { IsDateString, IsNotEmpty } from 'class-validator';

export class RegistrarRevisionDto {
  @IsDateString()
  @IsNotEmpty()
  proxima_mantencion: string;
}
