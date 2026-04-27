import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * POST /api/email/enviar-qr
   * Genera y envía el código QR al cliente por correo.
   */
  @Post('enviar-qr')
  @UseGuards(JwtGuard)
  async enviarQR(
    @Body() body: { email: string; clienteId: string; nombreCliente: string },
  ) {
    return await this.emailService.enviarQR(
      body.email,
      body.clienteId,
      body.nombreCliente,
    );
  }
}
