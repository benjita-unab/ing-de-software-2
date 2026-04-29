import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * POST /api/email/enviar-qr
   * Genera y envía el código QR al cliente por correo.
   *
   * Body:
   *   email          (req)  destinatario
   *   clienteId      (req)  fallback legacy si no se entrega rutaId
   *   nombreCliente  (req)  para saludo + asunto
   *   rutaId         (opt)  RECOMENDADO. Hace que el QR codifique
   *                          {ruta_id, codigo_otp} para que coincida
   *                          con lo que escanea el scanner mobile.
   *   codigoOtp      (opt)  Si no viene, el backend lo resuelve
   *                          desde la tabla `entregas`.
   */
  @Post('enviar-qr')
  @UseGuards(JwtGuard)
  async enviarQR(
    @Body()
    body: {
      email: string;
      clienteId: string;
      nombreCliente: string;
      rutaId?: string;
      codigoOtp?: string;
    },
  ) {
    return await this.emailService.enviarQR(
      body.email,
      body.clienteId,
      body.nombreCliente,
      body.rutaId,
      body.codigoOtp,
    );
  }
}
