import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChatMensajeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  contenido: string;
}
