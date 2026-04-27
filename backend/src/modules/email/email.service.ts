import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResendConfigService } from '../../config/resend.config';

@Injectable()
export class EmailService {
  constructor(private readonly resendConfig: ResendConfigService) {}

  async enviarQR(email: string, clienteId: string, nombreCliente: string) {
    if (!email?.trim()) {
      throw new BadRequestException('email es requerido');
    }
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }
    if (!nombreCliente?.trim()) {
      throw new BadRequestException('nombreCliente es requerido');
    }

    const nombreSeguro = this.escapeHtml(nombreCliente.trim());
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(clienteId.trim())}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h1 style="color: #1565c0;">Hola, ${nombreSeguro}</h1>
          <p>Aquí está tu código QR para presentar a la hora de la recepción de carga:</p>
          <div style="margin: 24px 0;">
            <img src="${qrUrl}" alt="Código QR" style="border: 1px solid #E5E7EB; border-radius: 8px;" />
          </div>
          <p style="color: #6B7280;">Slds,<br/>LogiTrack</p>
        </body>
      </html>
    `;

    try {
      await this.resendConfig.sendEmail(
        email.trim(),
        `Código QR para Entrega - ${nombreSeguro}`,
        html,
      );
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Error al enviar QR por email: ${error?.message}`,
      );
    }

    return { message: 'QR enviado correctamente' };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
