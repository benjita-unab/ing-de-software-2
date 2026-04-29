import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ResendConfigService } from '../../config/resend.config';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EntregasService {
  constructor(
    private supabaseConfig: SupabaseConfigService,
    private resendConfig: ResendConfigService,
  ) {}

  /**
   * Cierra una entrega: genera PDF, envía email y marca como validada.
   *
   * Diseñado para que NUNCA un fallo opcional (firma faltante, foto
   * corrupta, email caído, columna `estado` rara) tire 500. Solo se
   * propaga error si la ruta no existe o si la subida del PDF falla
   * sin alternativas.
   */
  async closeDelivery(rutaId: string, clienteEmail?: string) {
    console.log('CLOSE DELIVERY START -> rutaId:', rutaId, 'clienteEmail:', clienteEmail);

    if (!rutaId) {
      throw new BadRequestException('rutaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    // ── 1) Cargar ruta ───────────────────────────────────────────
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
      console.warn('CLOSE DELIVERY -> ruta no encontrada:', rutaError);
      throw new NotFoundException(
        `Ruta no encontrada: ${rutaError?.message ?? 'sin detalle'}`,
      );
    }
    console.log('CLOSE DELIVERY -> ruta cargada OK:', ruta.id);

    const cliente = Array.isArray(ruta.clientes)
      ? ruta.clientes[0]
      : ruta.clientes;

    try {
      // ── 2) Firma del receptor (best effort) ───────────────────
      console.log('PDF STEP -> descargando firma');
      let firmaBuffer: Buffer | null = null;
      let firmaUrl: string | null = null;
      try {
        const { data: entregasFirma } = await supabase
          .from('entregas')
          .select('firma_url, created_at')
          .eq('ruta_id', rutaId)
          .not('firma_url', 'is', null)
          .order('created_at', { ascending: false });

        firmaUrl = entregasFirma?.[0]?.firma_url ?? null;
        console.log('PDF STEP -> firmaUrl:', firmaUrl);

        if (firmaUrl) {
          const marker = '/storage/v1/object/public/fotos_trazabilidad/';
          const filePath = firmaUrl.includes(marker)
            ? firmaUrl.split(marker)[1]
            : null;

          if (filePath) {
            try {
              const { data: firmaBlob, error: downloadError } =
                await supabase.storage
                  .from('fotos_trazabilidad')
                  .download(filePath);

              if (downloadError) {
                console.warn(
                  'PDF STEP ERROR -> firma download:',
                  downloadError.message,
                );
              } else if (firmaBlob) {
                const arrayBuffer = await firmaBlob.arrayBuffer();
                firmaBuffer = Buffer.from(arrayBuffer);
                console.log('PDF STEP -> firma bytes:', firmaBuffer.length);
              }
            } catch (e: any) {
              // Acá caen `fetch failed` y similares del cliente Supabase.
              console.warn(
                'PDF STEP ERROR -> excepción red al descargar firma:',
                e?.message,
              );
            }
          } else {
            console.warn(
              'PDF STEP -> firma_url no apunta a fotos_trazabilidad:',
              firmaUrl,
            );
          }
        } else {
          console.warn('PDF STEP -> sin firma_url en BD');
        }
      } catch (e: any) {
        // La firma es OPCIONAL para no bloquear el cierre.
        console.warn(
          'PDF STEP ERROR -> excepción obteniendo firma (continuamos sin firma):',
          e?.message,
        );
      }

      // ── 3) Evidencias fotográficas (best effort) ──────────────
      console.log('PDF STEP -> descargando evidencias');
      let evidencias: Array<{
        etapa: string | null;
        buffer: Buffer;
        timestamp: string | null;
      }> = [];
      try {
        evidencias = await this.obtenerEvidenciasParaPDF(
          rutaId,
          ruta.fecha_inicio as unknown as string | null,
          ruta.fecha_fin as unknown as string | null,
        );
      } catch (e: any) {
        console.warn(
          'PDF STEP ERROR -> evidencias (continuamos sin fotos):',
          e?.message,
        );
        evidencias = [];
      }
      console.log('PDF STEP -> evidencias listas:', evidencias.length);

      // ── 4) Generar PDF (defensivo: nunca debe tirar) ─────────
      console.log('PDF STEP -> generando PDF');
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await this.generateDeliveryPDF({
          rutaId: ruta.id,
          origen: ruta.origen,
          destino: ruta.destino,
          fechaInicio: ruta.fecha_inicio,
          fechaFin: ruta.fecha_fin,
          cliente,
          conductor: ruta.conductores,
          camion: ruta.camiones,
          firmaBuffer,
          evidencias,
        });
        console.log('PDF STEP -> PDF generado, bytes:', pdfBuffer?.length ?? 0);
      } catch (e: any) {
        // Si por algún motivo el PDF falla CON evidencias, reintentamos
        // sin evidencias (regla 9 del usuario).
        console.warn(
          'PDF STEP ERROR -> generateDeliveryPDF falló con evidencias, reintento sin evidencias:',
          e?.message,
        );
        try {
          pdfBuffer = await this.generateDeliveryPDF({
            rutaId: ruta.id,
            origen: ruta.origen,
            destino: ruta.destino,
            fechaInicio: ruta.fecha_inicio,
            fechaFin: ruta.fecha_fin,
            cliente,
            conductor: ruta.conductores,
            camion: ruta.camiones,
            firmaBuffer,
            evidencias: [],
          });
          console.log(
            'PDF STEP -> PDF generado SIN evidencias, bytes:',
            pdfBuffer?.length ?? 0,
          );
        } catch (e2: any) {
          console.error(
            'PDF STEP ERROR -> generateDeliveryPDF falló incluso sin evidencias:',
            e2?.message,
            e2?.stack,
          );
          throw new InternalServerErrorException(
            `No se pudo generar el comprobante PDF: ${e2?.message ?? 'error desconocido'}`,
          );
        }
      }

      // ── 5) Subir PDF a Storage con retry (única operación que SÍ
      //     puede abortar el cierre, según la regla 6 del usuario). ──
      console.log('PDF STEP -> subiendo PDF');
      const pdfFilename = `${Date.now()}-${uuidv4()}.pdf`;
      const pdfPath = `comprobantes/${rutaId}/${pdfFilename}`;

      const uploadOk = await this.subirPDFConRetry(
        supabase,
        pdfPath,
        pdfBuffer,
      );

      if (!uploadOk.success) {
        console.error(
          'PDF STEP ERROR -> upload definitivo (sin más retries):',
          uploadOk.error,
        );
        throw new InternalServerErrorException(
          `Error al subir PDF: ${uploadOk.error || 'fallo de red al guardar comprobante'}`,
        );
      }
      console.log('PDF STEP -> PDF subido a:', pdfPath);

      const { data: publicUrlData } = supabase.storage
        .from('entregas')
        .getPublicUrl(pdfPath);

      // ── 6) Enviar email (best effort: no rompe el cierre) ────
      const emailDestino = clienteEmail || cliente?.contacto_email || null;
      if (emailDestino) {
        try {
          await this.sendDeliveryEmail(
            emailDestino,
            cliente?.nombre || 'Cliente',
            pdfBuffer,
            rutaId,
          );
          console.log('CLOSE DELIVERY -> email enviado a:', emailDestino);
        } catch (e: any) {
          console.warn(
            'CLOSE DELIVERY -> error enviando email (continuamos):',
            e?.message,
          );
        }
      } else {
        console.warn(
          'CLOSE DELIVERY -> sin email destino, se omite envío de correo',
        );
      }

      // ── 7) Marcar entregas como validadas (tolerante al enum) ──
      try {
        // Algunos ambientes tienen el enum `estado_entrega` con valor
        // ENTREGADA, otros no lo aceptan. Si el primer intento falla
        // por enum/columna, reintentamos sin la columna `estado`.
        const updatePayload: Record<string, unknown> = {
          validado: true,
          fecha_entrega_real: new Date().toISOString(),
          estado: 'ENTREGADA',
        };
        const { error: updateError } = await supabase
          .from('entregas')
          .update(updatePayload)
          .eq('ruta_id', rutaId);

        if (updateError) {
          console.warn(
            'CLOSE DELIVERY -> update entregas con estado falló, reintentando sin estado:',
            updateError.message,
          );
          delete updatePayload.estado;
          const { error: retryError } = await supabase
            .from('entregas')
            .update(updatePayload)
            .eq('ruta_id', rutaId);
          if (retryError) {
            console.warn(
              'CLOSE DELIVERY -> retry update entregas también falló:',
              retryError.message,
            );
          }
        }
        console.log('CLOSE DELIVERY -> entregas marcadas validado=true');
      } catch (e: any) {
        console.warn(
          'CLOSE DELIVERY -> excepción marcando entregas validadas:',
          e?.message,
        );
      }

      // ── 8) Pasar la ruta a ENTREGADO (enum estado_ruta) ──────
      try {
        const { error: estadoRutaError } = await supabase
          .from('rutas')
          .update({ estado: 'ENTREGADO', fecha_fin: new Date().toISOString() })
          .eq('id', rutaId);
        if (estadoRutaError) {
          console.warn(
            'CLOSE DELIVERY -> error actualizando rutas.estado a ENTREGADO:',
            estadoRutaError.message,
          );
        } else {
          console.log('CLOSE DELIVERY -> rutas.estado=ENTREGADO OK');
        }
      } catch (e: any) {
        console.warn(
          'CLOSE DELIVERY -> excepción actualizando rutas.estado:',
          e?.message,
        );
      }

      console.log('CLOSE DELIVERY END -> OK rutaId:', rutaId);
      return {
        success: true,
        message: 'Entrega cerrada exitosamente',
        data: {
          rutaId,
          pdfUrl: publicUrlData.publicUrl,
          emailEnviadoA: emailDestino,
          clienteNombre: cliente?.nombre,
        },
      };
    } catch (error: any) {
      // Log COMPLETO con todo lo que pueda venir desde Supabase / pdfkit / Resend.
      console.error('ERROR CLOSE DELIVERY FULL:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        name: error?.name,
      });
      // Mantenemos el throw para que mobile sepa que algo falló, pero
      // con mensaje útil. NestJS lo serializa como
      // {statusCode, message, error} y el mobile debe leer `message`.
      throw new InternalServerErrorException(
        `Error cerrando entrega: ${error?.message ?? 'error desconocido'}`,
      );
    }
  }

  /**
   * Guarda la firma de recepción
   */
  async saveSignature(rutaId: string, base64Signature: string) {
    console.log("ENTRO A SAVE SIGNATURE");
    console.log("DATA:", { rutaId, base64Signature });
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
        .from('fotos_trazabilidad')
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
        .from('fotos_trazabilidad')
        .getPublicUrl(filePath);

      // Actualizar registro de entrega
      const {
        data: updatedRows,
        error: updateError,
      } = await supabase
        .from('entregas')
        .update({ firma_url: publicUrlData.publicUrl })
        .eq('ruta_id', rutaId)
        .select('id, ruta_id, firma_url');

      if (updateError) {
        console.warn(`No se pudo actualizar firma en BD: ${updateError.message}`);
        throw new BadRequestException(
          `Error actualizando firma en BD: ${updateError.message}`,
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.warn(
          `⚠️ UPDATE firma_url afectó 0 filas para ruta_id=${rutaId}`,
        );
        throw new BadRequestException(
          `No existe entrega para ruta_id=${rutaId}`,
        );
      }

      console.log('Firma actualizada en BD, filas:', updatedRows);

      return {
        success: true,
        message: 'Firma guardada exitosamente',
        data: {
          rutaId,
          firmaUrl: publicUrlData.publicUrl,
          entregas: updatedRows,
        },
      };
    } catch (error: any) {
      // TEMP LOG
      console.error('ERROR SAVE SIGNATURE:', error);
      throw new InternalServerErrorException(
        `Error guardando firma: ${error?.message}`,
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
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Error guardando foto: ${error?.message}`,
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
   * Formatea una fecha ISO al formato `dd-mm-yyyy, HH:mm` (hora local Chile).
   * Si la fecha es inválida o vacía, devuelve "No registrada".
   */
  private formatearFecha(iso?: string | null): string {
    if (!iso) return 'No registrada';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'No registrada';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy}, ${hh}:${mins}`;
  }

  /**
   * Sube un PDF al bucket `entregas` con reintentos. El cliente Supabase
   * usa `fetch` por debajo y cualquier blip de red (DNS, IPv6, TLS,
   * timeout) lo reporta como `"fetch failed"`. Reintentamos con backoff
   * exponencial antes de dar el error al usuario.
   */
  private async subirPDFConRetry(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    pdfPath: string,
    pdfBuffer: Buffer,
    maxIntentos: number = 3,
  ): Promise<{ success: boolean; error?: string }> {
    let ultimoError = '';
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        const { error } = await supabase.storage
          .from('entregas')
          .upload(pdfPath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
            cacheControl: '3600',
          });

        if (!error) {
          if (intento > 1) {
            console.log(`PDF STEP -> upload OK en intento ${intento}`);
          }
          return { success: true };
        }

        ultimoError = error.message || 'error desconocido en upload';
        console.warn(
          `PDF STEP ERROR -> upload intento ${intento}/${maxIntentos}: ${ultimoError}`,
        );
      } catch (e: any) {
        ultimoError = e?.message || 'excepción de red en upload';
        console.warn(
          `PDF STEP ERROR -> excepción upload intento ${intento}/${maxIntentos}: ${ultimoError}`,
        );
      }

      if (intento < maxIntentos) {
        const espera = 500 * Math.pow(2, intento - 1);
        await new Promise((r) => setTimeout(r, espera));
      }
    }
    return { success: false, error: ultimoError };
  }

  /**
   * Descarga una imagen desde su URL pública y devuelve un Buffer
   * apto para `doc.image(...)`. Devuelve null si falla por red, 404,
   * MIME no soportado por pdfkit (sólo PNG/JPEG), timeout, etc.
   *
   * El timeout es CRÍTICO: si el bucket no responde, sin esto el
   * await del cierre de despacho queda colgado para siempre y mobile
   * eventualmente lanza un 500 vía watchdog.
   */
  private async descargarImagen(
    url: string,
    timeoutMs: number = 8000,
  ): Promise<Buffer | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        console.warn(
          `PDF: no se pudo descargar imagen (${res.status}): ${url}`,
        );
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      const motivo =
        err?.name === 'AbortError' ? 'timeout' : err?.message ?? 'error';
      console.warn(`PDF: error descargando imagen (${motivo}): ${url}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Reúne las evidencias fotográficas de una ruta para insertarlas
   * en el PDF. Misma estrategia que `RutasService.getEvidencias`:
   *   1) Tabla `fotos` por `ruta_id`.
   *   2) Fallback a `traceability_events` por `ruta_id`.
   *   3) Fallback final por ventana temporal `[fecha_inicio, fecha_fin]`.
   * Devuelve los buffers ya descargados, listos para `doc.image`.
   */
  private async obtenerEvidenciasParaPDF(
    rutaId: string,
    fechaInicio: string | null,
    fechaFin: string | null,
  ): Promise<Array<{ etapa: string | null; buffer: Buffer; timestamp: string | null }>> {
    type FotoUrl = { etapa: string | null; url: string; timestamp: string | null };
    const fotosUrls: FotoUrl[] = [];

    let supabase;
    try {
      supabase = this.supabaseConfig.getClient();
    } catch (e: any) {
      console.warn(
        'EVIDENCIAS -> no se pudo instanciar supabase (continuamos sin fotos):',
        e?.message,
      );
      return [];
    }

    // 1) tabla `fotos` — best effort
    try {
      const { data: fotosRow, error: fotosErr } = await supabase
        .from('fotos')
        .select('etapa, url, created_at')
        .eq('ruta_id', rutaId)
        .order('created_at', { ascending: true });

      if (fotosErr) {
        console.warn(
          'EVIDENCIAS -> query a tabla fotos falló:',
          fotosErr.message,
        );
      } else {
        for (const f of fotosRow || []) {
          const url = (f as any)?.url;
          if (!url) continue;
          fotosUrls.push({
            etapa: (f as any)?.etapa ?? null,
            url,
            timestamp: (f as any)?.created_at ?? null,
          });
        }
      }
    } catch (e: any) {
      console.warn('EVIDENCIAS -> excepción consultando tabla fotos:', e?.message);
    }

    // 2) fallback en traceability_events — best effort
    if (fotosUrls.length === 0) {
      try {
        let traceData: Array<{
          etapa: string | null;
          foto_uri: string | null;
          timestamp_evento: string | null;
        }> = [];

        const exactos = await supabase
          .from('traceability_events')
          .select('etapa, foto_uri, timestamp_evento')
          .eq('ruta_id', rutaId)
          .order('timestamp_evento', { ascending: true });

        const colMissing =
          exactos.error &&
          ['42703', 'PGRST204'].includes(
            (exactos.error as { code?: string }).code || '',
          );

        if (!exactos.error && exactos.data && exactos.data.length > 0) {
          traceData = exactos.data as any;
        } else if (
          (colMissing || (!exactos.error && (exactos.data || []).length === 0)) &&
          fechaInicio
        ) {
          const desde = fechaInicio;
          const hasta = fechaFin || new Date().toISOString();
          const fallback = await supabase
            .from('traceability_events')
            .select('etapa, foto_uri, timestamp_evento')
            .gte('timestamp_evento', desde)
            .lte('timestamp_evento', hasta)
            .order('timestamp_evento', { ascending: true });
          traceData = (fallback.data as any) || [];
        }

        for (const ev of traceData) {
          if (!ev?.foto_uri) continue;
          let url: string | null = null;
          try {
            url = this.supabaseConfig.getPublicUrl(
              'fotos_trazabilidad',
              ev.foto_uri,
            );
          } catch (e: any) {
            console.warn(
              'EVIDENCIAS -> getPublicUrl falló para',
              ev.foto_uri,
              e?.message,
            );
          }
          if (!url) continue;
          fotosUrls.push({
            etapa: ev.etapa ?? null,
            url,
            timestamp: ev.timestamp_evento ?? null,
          });
        }
      } catch (e: any) {
        console.warn(
          'EVIDENCIAS -> excepción consultando traceability_events:',
          e?.message,
        );
      }
    }

    // 3) Descarga de buffers en paralelo (cada descarga ya captura su error)
    let buffers: Array<Buffer | null> = [];
    try {
      buffers = await Promise.all(
        fotosUrls.map((f) => this.descargarImagen(f.url)),
      );
    } catch (e: any) {
      console.warn('EVIDENCIAS -> Promise.all descargas falló:', e?.message);
      buffers = fotosUrls.map((): Buffer | null => null);
    }

    const resultado: Array<{
      etapa: string | null;
      buffer: Buffer;
      timestamp: string | null;
    }> = [];
    for (let i = 0; i < fotosUrls.length; i++) {
      const buf = buffers[i];
      if (buf) {
        resultado.push({
          etapa: fotosUrls[i].etapa,
          buffer: buf,
          timestamp: fotosUrls[i].timestamp,
        });
      }
    }
    return resultado;
  }

  /**
   * Genera el PDF "Comprobante de despacho" con tabla Concepto/Detalle,
   * firma digital del receptor y galería de evidencias agrupadas por etapa.
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
    firmaBuffer?: Buffer | null;
    evidencias?: Array<{
      etapa: string | null;
      buffer: Buffer;
      timestamp: string | null;
    }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const COLOR_TEXTO = '#111827';
      const COLOR_TENUE = '#6B7280';
      const COLOR_LINEA = '#D1D5DB';
      const COLOR_HEADER_FONDO = '#F3F4F6';
      const COLOR_ACENTO = '#1565C0';

      const margenIzq = doc.page.margins.left;
      const margenDer = doc.page.margins.right;
      const anchoUtil = doc.page.width - margenIzq - margenDer;

      // ── 1) ENCABEZADO ────────────────────────────────────────────
      doc
        .fillColor(COLOR_ACENTO)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('COMPROBANTE DE DESPACHO', { align: 'center' });

      doc
        .fillColor(COLOR_TENUE)
        .font('Helvetica-Oblique')
        .fontSize(10)
        .text(`Generado el ${this.formatearFecha(new Date().toISOString())}`, {
          align: 'center',
        });

      doc.moveDown(1.2);

      // Línea separadora
      const yLinea1 = doc.y;
      doc
        .strokeColor(COLOR_LINEA)
        .lineWidth(1)
        .moveTo(margenIzq, yLinea1)
        .lineTo(margenIzq + anchoUtil, yLinea1)
        .stroke();
      doc.moveDown(0.8);

      // ── 2) TABLA Concepto / Detalle ─────────────────────────────
      const filas: Array<[string, string]> = [
        ['ID de ruta', data.rutaId],
        ['Cliente', data.cliente?.nombre || 'N/A'],
      ];
      if (data.cliente?.contacto_email) {
        filas.push(['Correo de contacto', data.cliente.contacto_email]);
      }
      filas.push(
        ['Origen', data.origen || 'N/A'],
        ['Destino', data.destino || 'N/A'],
        ['Conductor', data.conductor?.rut || 'N/A'],
        ['Vehículo', data.camion?.patente || 'N/A'],
        ['Fecha de inicio', this.formatearFecha(data.fechaInicio)],
        ['Fecha de entrega', this.formatearFecha(data.fechaFin)],
        ['Estado validación', 'ENTREGADO – VALIDADO'],
      );

      const colConceptoAncho = anchoUtil * 0.32;
      const colDetalleAncho = anchoUtil - colConceptoAncho;
      const padCelda = 8;

      // Header de la tabla
      doc.fillColor(COLOR_TEXTO).font('Helvetica-Bold').fontSize(11);
      const yHeader = doc.y;
      const altoHeader = 22;
      doc
        .fillColor(COLOR_HEADER_FONDO)
        .rect(margenIzq, yHeader, anchoUtil, altoHeader)
        .fill();
      doc
        .fillColor(COLOR_TEXTO)
        .text('Concepto', margenIzq + padCelda, yHeader + 6, {
          width: colConceptoAncho - padCelda,
          align: 'left',
        });
      doc.text(
        'Detalle',
        margenIzq + colConceptoAncho + padCelda,
        yHeader + 6,
        { width: colDetalleAncho - padCelda * 2, align: 'left' },
      );
      doc.y = yHeader + altoHeader;

      // Borde top tabla
      doc
        .strokeColor(COLOR_LINEA)
        .lineWidth(0.5)
        .rect(margenIzq, yHeader, anchoUtil, altoHeader)
        .stroke();

      // Filas
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_TEXTO);
      for (const [concepto, detalle] of filas) {
        const yFila = doc.y;

        // Calcular alto requerido por la celda de detalle (texto puede ser largo)
        const altoConcepto = doc.heightOfString(concepto, {
          width: colConceptoAncho - padCelda * 2,
        });
        const altoDetalle = doc.heightOfString(detalle, {
          width: colDetalleAncho - padCelda * 2,
        });
        const altoFila = Math.max(altoConcepto, altoDetalle) + padCelda * 2;

        // Si no cabe, salto de página y repinto la cabecera básica
        if (yFila + altoFila > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }

        const yActual = doc.y;
        doc
          .strokeColor(COLOR_LINEA)
          .lineWidth(0.5)
          .rect(margenIzq, yActual, anchoUtil, altoFila)
          .stroke();
        // Línea divisoria entre columnas
        doc
          .moveTo(margenIzq + colConceptoAncho, yActual)
          .lineTo(margenIzq + colConceptoAncho, yActual + altoFila)
          .stroke();

        doc
          .font('Helvetica-Bold')
          .fillColor(COLOR_TEXTO)
          .text(concepto, margenIzq + padCelda, yActual + padCelda, {
            width: colConceptoAncho - padCelda * 2,
          });

        doc
          .font('Helvetica')
          .fillColor(COLOR_TEXTO)
          .text(
            detalle,
            margenIzq + colConceptoAncho + padCelda,
            yActual + padCelda,
            { width: colDetalleAncho - padCelda * 2 },
          );

        doc.y = yActual + altoFila;
      }

      doc.moveDown(1.2);

      // ── 3) FIRMA DIGITAL ────────────────────────────────────────
      if (doc.y > doc.page.height - doc.page.margins.bottom - 180) {
        doc.addPage();
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(COLOR_TEXTO)
        .text('Firma digital del receptor', { align: 'center' });
      doc.moveDown(0.6);

      const firmaAncho = 220;
      const firmaAlto = 110;
      const xFirma = margenIzq + (anchoUtil - firmaAncho) / 2;

      if (data.firmaBuffer && data.firmaBuffer.length > 0) {
        try {
          doc.image(data.firmaBuffer, xFirma, doc.y, {
            fit: [firmaAncho, firmaAlto],
            align: 'center',
          });
          doc.y += firmaAlto + 6;
          // Línea base bajo la firma
          doc
            .strokeColor(COLOR_LINEA)
            .lineWidth(0.5)
            .moveTo(xFirma, doc.y)
            .lineTo(xFirma + firmaAncho, doc.y)
            .stroke();
        } catch (err: any) {
          console.warn(`No se pudo insertar firma en PDF: ${err?.message}`);
          doc
            .font('Helvetica-Oblique')
            .fontSize(10)
            .fillColor(COLOR_TENUE)
            .text('Sin firma disponible', { align: 'center' });
        }
      } else {
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor(COLOR_TENUE)
          .text('Sin firma disponible', { align: 'center' });
      }

      doc.moveDown(1.5);

      // ── 4) EVIDENCIAS FOTOGRÁFICAS ──────────────────────────────
      if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
        doc.addPage();
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(COLOR_TEXTO)
        .text('Evidencias fotográficas', { align: 'left' });

      doc
        .strokeColor(COLOR_LINEA)
        .lineWidth(0.5)
        .moveTo(margenIzq, doc.y + 2)
        .lineTo(margenIzq + anchoUtil, doc.y + 2)
        .stroke();
      doc.moveDown(0.6);

      const evidencias = data.evidencias || [];
      if (evidencias.length === 0) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor(COLOR_TENUE)
          .text('No hay evidencias registradas', { align: 'left' });
      } else {
        // Agrupar por etapa
        const grupos = new Map<string, typeof evidencias>();
        for (const ev of evidencias) {
          const etapa = (ev.etapa || 'Sin etapa').toString().trim() || 'Sin etapa';
          if (!grupos.has(etapa)) grupos.set(etapa, [] as any);
          grupos.get(etapa)!.push(ev);
        }

        // Imagen: 2 por fila
        const fotoAncho = (anchoUtil - 12) / 2;
        const fotoAlto = 130;

        for (const [etapa, lista] of grupos) {
          if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
          }
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(COLOR_ACENTO)
            .text(etapa, { align: 'left' });
          doc.moveDown(0.3);

          for (let i = 0; i < lista.length; i += 2) {
            // Si no cabe la fila, salto de página
            if (
              doc.y + fotoAlto + 12 >
              doc.page.height - doc.page.margins.bottom
            ) {
              doc.addPage();
            }

            const yFoto = doc.y;
            const ev1 = lista[i];
            const ev2 = lista[i + 1];

            try {
              doc.image(ev1.buffer, margenIzq, yFoto, {
                fit: [fotoAncho, fotoAlto],
                align: 'center',
              });
            } catch (err: any) {
              console.warn(
                `No se pudo insertar evidencia (${etapa}): ${err?.message}`,
              );
            }
            if (ev2) {
              try {
                doc.image(
                  ev2.buffer,
                  margenIzq + fotoAncho + 12,
                  yFoto,
                  { fit: [fotoAncho, fotoAlto], align: 'center' },
                );
              } catch (err: any) {
                console.warn(
                  `No se pudo insertar evidencia (${etapa}): ${err?.message}`,
                );
              }
            }

            doc.y = yFoto + fotoAlto + 10;
          }
          doc.moveDown(0.4);
        }
      }

      // ── 5) FOOTER ───────────────────────────────────────────────
      doc.moveDown(1.2);
      const yFooter = doc.page.height - doc.page.margins.bottom - 20;
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor(COLOR_TENUE)
        .text(
          `LogiTrack — Documento generado el ${this.formatearFecha(new Date().toISOString())}`,
          margenIzq,
          yFooter,
          { align: 'center', width: anchoUtil },
        );

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
    } catch (error: any) {
      console.error(`Error enviando email: ${error?.message}`);
      // No lanzar excepción, solo registrar
    }
  }
}
