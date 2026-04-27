import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ResendConfigService } from '../../config/resend.config';
import * as PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EntregasService {
  constructor(
    private supabaseConfig: SupabaseConfigService,
    private resendConfig: ResendConfigService,
  ) {}

  /**
   * Cierra una entrega: genera PDF, envía email y marca como validada
   */
  async closeDelivery(rutaId: string, clienteEmail?: string) {
    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    // Obtener información de la ruta
    const { data: ruta, error: rutaError } = await supabase
      .from('rutas')
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        origen,
        destino,
        clientes(id, nombre, contacto_email),
        conductores(rut),
        camiones(patente)
      `)
      .eq('id', rutaId)
      .single();

    if (rutaError || !ruta) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaError?.message}`);
    }

    // Obtener entregas asociadas
    const { data: entregas, error: entregasError } = await supabase
      .from('entregas')
      .select('id, token_verificacion, codigo_otp')
      .eq('ruta_id', rutaId);

    if (entregasError) {
      throw new BadRequestException(`Error al obtener entregas: ${entregasError.message}`);
    }

    try {
      // 1. Generar PDF
      const pdfBuffer = await this.generateDeliveryPDF({
        rutaId: ruta.id,
        origen: ruta.origen,
        destino: ruta.destino,
        fechaInicio: ruta.fecha_inicio,
        fechaFin: ruta.fecha_fin,
        cliente: ruta.clientes,
        conductor: ruta.conductores,
        camion: ruta.camiones,
      });

      // 2. Subir PDF a Storage
      const pdfPath = `comprobantes/${rutaId}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('entregas')
        .upload(pdfPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new InternalServerErrorException(
          `Error al subir PDF: ${uploadError.message}`,
        );
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('entregas')
        .getPublicUrl(pdfPath);

      // 3. Enviar email al cliente
      const emailDestino = clienteEmail || ruta.clientes?.contacto_email;
      if (emailDestino) {
        await this.sendDeliveryEmail(
          emailDestino,
          ruta.clientes?.nombre || 'Cliente',
          pdfBuffer,
          rutaId,
        );
      }

      // 4. Marcar entregas como validadas
      const { error: updateError } = await supabase
        .from('entregas')
        .update({
          validado: true,
          fecha_entrega_real: new Date().toISOString(),
          estado: 'ENTREGADA',
        })
        .eq('ruta_id', rutaId);

      if (updateError) {
        console.warn(`No se pudieron marcar entregas como validadas: ${updateError.message}`);
      }

      // 5. Cambiar estado de ruta
      await supabase
        .from('rutas')
        .update({ estado: 'ENTREGADA', fecha_fin: new Date().toISOString() })
        .eq('id', rutaId);

      return {
        success: true,
        message: 'Entrega cerrada exitosamente',
        data: {
          rutaId,
          pdfUrl: publicUrlData.publicUrl,
          emailEnviadoA: emailDestino,
          clienteNombre: ruta.clientes?.nombre,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error cerrando entrega: ${error.message}`,
      );
    }
  }

  /**
   * Guarda la firma de recepción
   */
  async saveSignature(rutaId: string, base64Signature: string) {
    if (!rutaId || !base64Signature) {
      throw new BadRequestException('rutaId y base64Signature son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    try {
      // Remover header de data URI
      const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, '');

      // Convertir base64 a Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Generar path único
      const filePath = `firmas/${rutaId}-${Date.now()}.png`;

      // Subir a Storage
      const { data, error: uploadError } = await supabase.storage
        .from('entregas')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(
          `Error al subir firma: ${uploadError.message}`,
        );
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('entregas')
        .getPublicUrl(filePath);

      // Actualizar registro de entrega
      const { error: updateError } = await supabase
        .from('entregas')
        .update({ firma_url: publicUrlData.publicUrl })
        .eq('ruta_id', rutaId);

      if (updateError) {
        console.warn(`No se pudo actualizar firma en BD: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Firma guardada exitosamente',
        data: {
          rutaId,
          firmaUrl: publicUrlData.publicUrl,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error guardando firma: ${error.message}`,
      );
    }
  }

  /**
   * Guarda la foto de la ficha de despacho
   */
  async savePhoto(rutaId: string, base64Photo: string) {
    if (!rutaId || !base64Photo) {
      throw new BadRequestException('rutaId y base64Photo son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    try {
      // Remover header
      const base64Data = base64Photo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generar path
      const filePath = `fichas_despacho/${rutaId}-${Date.now()}.jpg`;

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('entregas')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new BadRequestException(`Error al subir foto: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('entregas')
        .getPublicUrl(filePath);

      // Actualizar ruta con URL de ficha
      const { error: updateError } = await supabase
        .from('rutas')
        .update({ ficha_despacho_url: publicUrlData.publicUrl })
        .eq('id', rutaId);

      if (updateError) {
        console.warn(`No se pudo actualizar ficha en BD: ${updateError.message}`);
      }

      return {
        success: true,
        message: 'Foto guardada exitosamente',
        data: {
          rutaId,
          fotoUrl: publicUrlData.publicUrl,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error guardando foto: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene el estado de una entrega
   */
  async getDeliveryStatus(rutaId: string) {
    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: entrega, error } = await supabase
      .from('entregas')
      .select(`
        id,
        ruta_id,
        validado,
        firma_url,
        foto_url,
        estado,
        fecha_entrega_real,
        created_at
      `)
      .eq('ruta_id', rutaId)
      .single();

    if (error) {
      throw new NotFoundException(`Entrega no encontrada: ${error.message}`);
    }

    return entrega;
  }

  // ========== HELPERS PRIVADOS ==========

  /**
   * Genera un PDF de comprobante de entrega
   */
  private async generateDeliveryPDF(data: {
    rutaId: string;
    origen: string;
    destino: string;
    fechaInicio: string;
    fechaFin: string;
    cliente: any;
    conductor: any;
    camion: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('COMPROBANTE DE ENTREGA', {
        align: 'center',
      });

      doc.fontSize(10).font('Helvetica');
      doc.moveDown();

      // Información de ruta
      doc.text(`Ruta ID: ${data.rutaId}`);
      doc.text(`Origen: ${data.origen}`);
      doc.text(`Destino: ${data.destino}`);
      doc.moveDown();

      // Información del cliente
      doc.text(`Cliente: ${data.cliente?.nombre || 'N/A'}`);
      doc.moveDown();

      // Información del conductor
      doc.text(`Conductor: ${data.conductor?.rut || 'N/A'}`);
      doc.moveDown();

      // Información del vehículo
      doc.text(`Vehículo: ${data.camion?.patente || 'N/A'}`);
      doc.moveDown();

      // Fechas
      doc.text(
        `Fecha de inicio: ${new Date(data.fechaInicio).toLocaleString('es-CL')}`,
      );
      doc.text(`Fecha de fin: ${new Date(data.fechaFin).toLocaleString('es-CL')}`);
      doc.moveDown();

      // Footer
      doc
        .fontSize(8)
        .text(`Documento generado el ${new Date().toLocaleString('es-CL')}`, {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Envía email de comprobante de entrega al cliente
   */
  private async sendDeliveryEmail(
    emailCliente: string,
    nombreCliente: string,
    pdfBuffer: Buffer,
    rutaId: string,
  ) {
    const resend = this.resendConfig.getClient();

    try {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>¡Entrega completada!</h2>
            <p>Estimado/a ${nombreCliente},</p>
            <p>Su entrega ha sido completada exitosamente.</p>
            <p><strong>Ruta ID:</strong> ${rutaId}</p>
            <p>Adjunto encontrará el comprobante de entrega.</p>
            <br />
            <p>Saludos,<br />Sistema LogiTrack</p>
          </body>
        </html>
      `;

      // Convertir buffer a base64
      const base64Pdf = pdfBuffer.toString('base64');

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Sistema LogiTrack <onboarding@resend.dev>',
        to: emailCliente,
        subject: `Comprobante de Entrega - ${rutaId}`,
        html,
        attachments: [
          {
            filename: `comprobante-${rutaId}.pdf`,
            content: base64Pdf,
          },
        ],
      });
    } catch (error) {
      console.error(`Error enviando email: ${error.message}`);
      // No lanzar excepción, solo registrar
    }
  }
}
