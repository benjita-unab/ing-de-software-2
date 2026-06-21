import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ResendConfigService } from '../../config/resend.config';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class EmailService {
  /** Gmail SMTP — exclusivo para portal web (HU-60 recuperación contraseña). */
  private readonly smtpTransporter: Transporter | null;

  constructor(
    private readonly resendConfig: ResendConfigService,
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly config: ConfigService,
  ) {
    this.smtpTransporter = this.createSmtpTransporter();
  }

  private createSmtpTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const rawPass = this.config.get<string>('SMTP_PASS');
    const pass = rawPass?.replace(/\s/g, '') || '';

    if (!host || !user || !pass) {
      console.warn(
        '[EmailService] SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
          'enviarRecuperacionPassword no podrá enviar correos.',
      );
      return null;
    }

    const port = Number(this.config.get<string>('SMTP_PORT')) || 465;

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private getSmtpFromAddress(): string {
    const displayName =
      this.config.get<string>('SMTP_FROM_NAME')?.trim() || 'LogiTrack Web';
    const user =
      this.config.get<string>('SMTP_USER')?.trim() || 'noreply@logitrack.cl';
    return `"${displayName}" <${user}>`;
  }

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
   * HU-9: notificación al cliente con rango y día estimado de entrega.
   */
  async enviarNotificacionFechaEstimada(params: {
    email: string;
    nombreCliente: string;
    origen: string;
    destino: string;
    rutaId: string;
    rangoInicio: string;
    rangoFin: string;
    fechaEstimadaEntrega: string;
  }) {
    const email = params.email?.trim();
    if (!email) {
      throw new BadRequestException('email es requerido');
    }

    const nombreSeguro = this.escapeHtml(params.nombreCliente.trim());
    const origenSeguro = this.escapeHtml(params.origen.trim());
    const destinoSeguro = this.escapeHtml(params.destino.trim());
    const rutaIdSeguro = this.escapeHtml(params.rutaId.trim());
    const rangoSeguro = `${this.escapeHtml(params.rangoInicio)} – ${this.escapeHtml(params.rangoFin)}`;
    const fechaSegura = this.escapeHtml(params.fechaEstimadaEntrega);

    const asunto = `Entrega estimada - ${nombreSeguro}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h1 style="color: #1565c0;">Estimación de entrega</h1>
          <p>Hola, <strong>${nombreSeguro}</strong>,</p>
          <p>Le informamos el rango estimado de entrega para preparar la zona de descarga:</p>
          <p style="font-size: 16px;"><strong>Rango estimado:</strong> ${rangoSeguro}</p>
          <p style="font-size: 16px;"><strong>Fecha estimada:</strong> ${fechaSegura}</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p><strong>Origen:</strong> ${origenSeguro}</p>
          <p><strong>Destino:</strong> ${destinoSeguro}</p>
          <p><strong>Cliente:</strong> ${nombreSeguro}</p>
          <p><strong>ID de despacho:</strong> ${rutaIdSeguro}</p>
          <p style="color: #6B7280; margin-top: 24px;">Saludos,<br/>LogiTrack</p>
        </body>
      </html>
    `;

    try {
      const { id: resendId } = await this.resendConfig.sendEmail(
        email,
        asunto,
        html,
      );

      console.log('HU-9 notificación fecha estimada — envío Resend OK:', {
        destinatario: email,
        asunto,
        resendId,
      });

      return { asunto, resendId };
    } catch (error: any) {
      const errMsg = error?.message || 'Error desconocido';
      console.warn('HU-9 notificación fecha estimada — envío Resend falló:', {
        destinatario: email,
        asunto,
        error: errMsg,
      });
      throw new InternalServerErrorException(
        `Error al enviar notificación por email: ${errMsg}`,
      );
    }
  }

  /**
   * HU-60 CA-06: correo con enlace de recuperación de contraseña portal cliente.
   * Envío vía Gmail SMTP (nodemailer), no Resend — evita límite del plan free.
   */
  async enviarRecuperacionPassword(
    email: string,
    nombreUsuario: string,
    resetUrl: string,
  ) {
    if (!email?.trim()) {
      throw new BadRequestException('email es requerido');
    }
    if (!resetUrl?.trim()) {
      throw new BadRequestException('resetUrl es requerido');
    }

    if (!this.smtpTransporter) {
      console.error(
        '[EmailService] HU-60 recuperación contraseña — SMTP no inicializado. ' +
          'Verifique SMTP_HOST, SMTP_USER y SMTP_PASS en .env',
      );
      throw new InternalServerErrorException(
        'El servicio de correo del portal no está configurado',
      );
    }

    const nombreSeguro = this.escapeHtml(nombreUsuario.trim());
    const resetUrlRaw = resetUrl.trim();
    const asunto = 'Recuperación de contraseña — Portal LogiTrack';

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
          <h1 style="color: #1565c0;">Recuperación de contraseña</h1>
          <p>Hola, <strong>${nombreSeguro}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de su acceso al portal LogiTrack.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrlRaw}" style="background:#1565c0;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
              Restablecer contraseña
            </a>
          </p>
          <p style="color:#6B7280;font-size:13px;">Si el botón no funciona, copie este enlace en su navegador:<br/>
            <a href="${resetUrlRaw}">${this.escapeHtml(resetUrlRaw)}</a>
          </p>
          <p style="color:#6B7280;">Este enlace expira en 1 hora. Si no solicitó el cambio, ignore este correo.</p>
          <p style="color:#6B7280;">Saludos,<br/>LogiTrack</p>
        </body>
      </html>
    `;

    try {
      const info = await this.smtpTransporter.sendMail({
        from: this.getSmtpFromAddress(),
        to: email.trim(),
        subject: asunto,
        html,
      });

      console.log('[EmailService] HU-60 recuperación contraseña — SMTP OK:', {
        destinatario: email.trim(),
        messageId: info.messageId,
      });

      return { message: 'Correo de recuperación enviado', messageId: info.messageId };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        '[EmailService] HU-60 recuperación contraseña — SMTP falló:',
        { destinatario: email.trim(), error: errMsg },
      );
      throw new InternalServerErrorException(
        `Error al enviar correo de recuperación: ${errMsg}`,
      );
    }
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
