import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResendConfigService } from '../../config/resend.config';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class EmailService {
  constructor(
    private readonly resendConfig: ResendConfigService,
    private readonly supabaseConfig: SupabaseConfigService,
  ) {}

  /**
   * Envía un correo al cliente con el QR de validación de entrega.
   *
   * El QR codifica un JSON con `{ ruta_id, codigo_otp }` para que coincida
   * con el formato que escanea la app móvil. Si el caller no entrega
   * `rutaId`, se mantiene el comportamiento legacy (QR con `clienteId`
   * como texto plano), pero ese caso ya no debería ocurrir desde mobile.
   */
  async enviarQR(
    email: string,
    clienteId: string,
    nombreCliente: string,
    rutaId?: string,
    codigoOtp?: string,
  ) {
    if (!email?.trim()) {
      throw new BadRequestException('email es requerido');
    }
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }
    if (!nombreCliente?.trim()) {
      throw new BadRequestException('nombreCliente es requerido');
    }

    let qrPayload: string;

    const rutaIdLimpio = rutaId?.trim();
    if (rutaIdLimpio) {
      // Si no recibimos OTP explícito, intentamos resolverlo desde la BD
      // para que el QR ya lo lleve. Si no existe, lo dejamos en null.
      let codigoOtpResuelto = codigoOtp?.trim() || null;
      if (!codigoOtpResuelto) {
        codigoOtpResuelto = await this.buscarCodigoOtp(rutaIdLimpio);
      }

      qrPayload = JSON.stringify({
        ruta_id: rutaIdLimpio,
        codigo_otp: codigoOtpResuelto,
      });
    } else {
      // Compat legacy: QR con clienteId como texto plano. El scanner mobile
      // lo intentará parsear como UUID y comparará contra rutaId actual,
      // por lo que en la práctica fallará con "QR no corresponde".
      qrPayload = clienteId.trim();
    }

    // TEMP: diagnóstico de "QR no corresponde". Eliminar luego de validar.
    console.log('QR EMAIL PAYLOAD:', qrPayload);

    const nombreSeguro = this.escapeHtml(nombreCliente.trim());
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;

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

  /**
   * Busca el `codigo_otp` más reciente vinculado a la ruta. Si no existe
   * registro de entrega o la columna está vacía, devuelve null.
   */
  private async buscarCodigoOtp(rutaId: string): Promise<string | null> {
    try {
      const supabase = this.supabaseConfig.getClient();
      const { data } = await supabase
        .from('entregas')
        .select('codigo_otp, created_at')
        .eq('ruta_id', rutaId)
        .order('created_at', { ascending: false })
        .limit(1);

      const otp = data?.[0]?.codigo_otp;
      if (typeof otp === 'string' && otp.trim()) {
        return otp.trim();
      }
      return null;
    } catch (err) {
      console.warn('No se pudo resolver codigo_otp para ruta', rutaId, err);
      return null;
    }
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
