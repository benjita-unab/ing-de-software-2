import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
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
      // ── 2) Firma obligatoria (no cerrar con PDF si no hubo POST /signature OK)
      console.log('PDF STEP -> validando firma en entregas');
      const { data: entregaFirma } = await supabase
        .from('entregas')
        .select('id, firma_url')
        .eq('ruta_id', rutaId)
        .maybeSingle();

      const firmaUrlUsada = entregaFirma?.firma_url?.trim() ?? '';
      if (!firmaUrlUsada) {
        throw new BadRequestException(
          'No existe firma guardada para esta ruta. Complete POST /api/entregas/:rutaId/signature antes de cerrar.',
        );
      }

      let firmaBuffer: Buffer | null = null;
      try {
        firmaBuffer = await this.downloadFirmaBuffer(supabase, firmaUrlUsada);
        console.log(
          'PDF -> firma URL presente; firmaBuffer bytes:',
          firmaBuffer?.length ?? 0,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('PDF STEP ERROR -> descargando firma:', msg);
        throw new BadRequestException(
          `No se pudo obtener la imagen de firma guardada: ${msg}`,
        );
      }

      if (!firmaBuffer || firmaBuffer.length === 0) {
        throw new BadRequestException(
          'La firma guardada no se pudo descargar para el PDF. Verifique Storage y la URL en entregas.firma_url.',
        );
      }

      // ── 3) Generar PDF (sin evidencias: el PDF del correo solo
      //     incluye comprobante formal; las fotos se ven en el
      //     Historial web vía GET /api/rutas/:id/evidencias). ────
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
        });
        console.log('PDF STEP -> PDF generado, bytes:', pdfBuffer?.length ?? 0);
      } catch (e: any) {
        console.error(
          'PDF STEP ERROR -> generateDeliveryPDF falló:',
          e?.message,
          e?.stack,
        );
        throw new InternalServerErrorException(
          `No se pudo generar el comprobante PDF: ${e?.message ?? 'error desconocido'}`,
        );
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
      let emailEnviadoOk = false;
      if (emailDestino) {
        try {
          const resultadoEmail = await this.sendDeliveryEmail(
            emailDestino,
            cliente?.nombre || 'Cliente',
            pdfBuffer,
            rutaId,
          );
          emailEnviadoOk = resultadoEmail.ok;
          if (resultadoEmail.ok) {
            console.log(
              'CLOSE DELIVERY -> email enviado a:',
              emailDestino,
              'id:',
              resultadoEmail.id,
            );
          } else {
            console.warn(
              'CLOSE DELIVERY -> email no enviado:',
              resultadoEmail.errorMsg,
            );
          }
        } catch (e: any) {
          console.warn(
            'CLOSE DELIVERY -> excepción enviando email (continuamos):',
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

        try {
          await supabase.from('historial_estados').insert([
            {
              ruta_id: rutaId,
              estado: 'ENTREGADO',
              created_at: new Date().toISOString(),
            },
          ]);
          console.log('CLOSE DELIVERY -> historial_estados ENTREGADO registrado');
        } catch (histErr: any) {
          console.warn(
            'CLOSE DELIVERY -> historial_estados insert omitido:',
            histErr?.message,
          );
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
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('ERROR CLOSE DELIVERY FULL:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        name: error?.name,
      });
      throw new InternalServerErrorException(
        `Error cerrando entrega: ${error?.message ?? 'error desconocido'}`,
      );
    }
  }

  /**
   * Guarda la firma de recepción
   *
   * **Dónde debería existir la fila `entregas`:** lo ideal es crearla cuando la
   * operación de negocio abre la entrega (p. ej. al asignar ruta o al iniciar
   * despacho en web). Si no existe, aquí aplicamos **opción B** (fix mínimo):
   * insertar solo columnas que existen en `entregas` (`ruta_id`, etc.; no
   * `cliente_id` — vive en `rutas`).
   *
   * - Opción A: crear al enviar QR (`email`) — acopla envío de correo a BD.
   * - Opción C: crear al asignar ruta — requiere cambios en `rutas`/frontend web.
   */
  async saveSignature(rutaId: string, base64Signature: string) {
    console.log('SAVE SIGNATURE -> rutaId:', rutaId, 'payload length:', base64Signature?.length ?? 0);
    if (!rutaId || !base64Signature) {
      console.warn('SIGNATURE validation: falta rutaId o base64Signature');
      throw new BadRequestException('rutaId y base64Signature son requeridos');
    }

    const supabase = this.supabaseConfig.getClient();

    try {
      let { data: entregaRows, error: entregaLookupErr } = await supabase
        .from('entregas')
        .select('id,ruta_id,firma_url')
        .eq('ruta_id', rutaId);

      if (entregaLookupErr) {
        console.warn(
          'SIGNATURE entrega lookup error:',
          entregaLookupErr.message,
          {
            code: (entregaLookupErr as { code?: string }).code,
            details: (entregaLookupErr as { details?: string }).details,
            hint: (entregaLookupErr as { hint?: string }).hint,
          },
        );
      }

      let n = entregaRows?.length ?? 0;
      console.log('SIGNATURE entrega rows count:', n);

      if (n === 0) {
        const ensureResult =
          await this.tryEnsureEntregaRowForSignature(supabase, rutaId);
        if (ensureResult.ok === false) {
          const fail = ensureResult;
          throw new BadRequestException(
            `No se pudo crear la fila de entrega para ruta_id=${rutaId}. ` +
              `Columnas intentadas: ${fail.columnsTried.join(', ')}. ` +
              `Error BD: ${fail.dbMessage}` +
              (fail.code ? ` (${fail.code})` : ''),
          );
        }

        const again = await supabase
          .from('entregas')
          .select('id,ruta_id,firma_url')
          .eq('ruta_id', rutaId);
        entregaRows = again.data;
        if (again.error) {
          console.warn('SIGNATURE re-query after ensure:', again.error.message);
        }
        n = entregaRows?.length ?? 0;
        console.log('SIGNATURE entrega rows count after ensure:', n);
      }

      if (n === 0) {
        console.warn(
          'SIGNATURE abort: sin fila entregas y ensure falló o no aplicó para ruta_id=',
          rutaId,
        );
        throw new BadRequestException(
          `No existe entrega para ruta_id=${rutaId}. Debe crearse la entrega antes de firmar.`,
        );
      }

      // Remover header de data URI
      const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, '');

      // Convertir base64 a Buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Bucket fotos_trazabilidad, prefijo firmas/ (ruta en Storage)
      const filePath = `firmas/${rutaId}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('fotos_trazabilidad')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('SIGNATURE storage upload error:', {
          message: uploadError.message,
          name: (uploadError as { name?: string }).name,
        });
        throw new BadRequestException(
          `Error al subir firma: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('fotos_trazabilidad')
        .getPublicUrl(filePath);

      const {
        data: updatedRows,
        error: updateError,
      } = await supabase
        .from('entregas')
        .update({ firma_url: publicUrlData.publicUrl })
        .eq('ruta_id', rutaId)
        .select('id, ruta_id, firma_url');

      if (updateError) {
        console.error('SIGNATURE DB update error:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw new BadRequestException(
          `Error actualizando firma en BD: ${updateError.message}`,
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.warn(
          'SIGNATURE update firma_url affected 0 rows for ruta_id=',
          rutaId,
        );
        throw new BadRequestException(
          `No existe entrega para ruta_id=${rutaId}. Debe crearse la entrega antes de firmar.`,
        );
      }

      console.log('Firma actualizada en BD, filas:', updatedRows.length);

      return {
        success: true,
        message: 'Firma guardada exitosamente',
        data: {
          rutaId,
          firmaUrl: publicUrlData.publicUrl,
          entregas: updatedRows,
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const err = error as Record<string, unknown> & Error;
      console.error('ERROR SAVE SIGNATURE FULL', {
        message: err?.message,
        stack: err?.stack,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      throw new InternalServerErrorException(
        `Error guardando firma: ${err?.message ?? 'error desconocido'}`,
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
   * Opción B: crea una fila mínima en `entregas` si la ruta existe.
   * Solo usa columnas que existen en `entregas` (p. ej. no `cliente_id`).
   */
  private async tryEnsureEntregaRowForSignature(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    rutaId: string,
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        dbMessage: string;
        code?: string;
        columnsTried: string[];
      }
  > {
    const { data: ruta, error: rutaErr } = await supabase
      .from('rutas')
      .select('id')
      .eq('id', rutaId)
      .maybeSingle();

    if (rutaErr) {
      console.warn('SIGNATURE ensure -> rutas lookup:', rutaErr.message);
    }
    if (!ruta?.id) {
      console.warn('SIGNATURE ensure -> no hay ruta en BD para id=', rutaId);
      return {
        ok: false,
        dbMessage: 'La ruta no existe en la base de datos',
        code: rutaErr?.code,
        columnsTried: [],
      };
    }

    const tryInsert = async (payload: Record<string, unknown>) => {
      return await supabase
        .from('entregas')
        .insert(payload)
        .select('id')
        .maybeSingle();
    };

    const payloadWithValidado: Record<string, unknown> = {
      ruta_id: rutaId,
      validado: false,
      firma_url: null,
      comprobante_url: null,
      fecha_entrega_real: null,
    };

    let columnsTried = Object.keys(payloadWithValidado);
    let { data: inserted, error: insErr } =
      await tryInsert(payloadWithValidado);

    if (insErr) {
      const msg = insErr.message ?? '';
      const missingColumn =
        /Could not find the '(\w+)' column/i.exec(msg)?.[1] ?? null;

      if (
        missingColumn &&
        missingColumn in payloadWithValidado &&
        missingColumn !== 'ruta_id'
      ) {
        const minimal: Record<string, unknown> = { ruta_id: rutaId };
        columnsTried = Object.keys(minimal);
        const second = await tryInsert(minimal);
        inserted = second.data;
        insErr = second.error;
      }
    }

    if (insErr) {
      console.error('SIGNATURE ensure -> insert entregas failed:', {
        message: insErr.message,
        code: insErr.code,
        details: insErr.details,
        hint: insErr.hint,
      });
      return {
        ok: false,
        dbMessage: insErr.message,
        code: insErr.code,
        columnsTried,
      };
    }

    console.log(
      'SIGNATURE ensure -> fila entregas creada (opción B), id:',
      inserted?.id,
    );
    return { ok: true };
  }

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
   * Descarga imagen de firma: primero fetch(URL pública); fallback storage en fotos_trazabilidad.
   */
  private async downloadFirmaBuffer(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    firmaUrl: string,
  ): Promise<Buffer | null> {
    const trimmed = firmaUrl.trim();
    if (!trimmed) return null;

    try {
      const response = await fetch(trimmed);
      if (response.ok) {
        const buf = Buffer.from(await response.arrayBuffer());
        if (buf.length > 0) {
          console.log('downloadFirmaBuffer -> fetch OK, bytes:', buf.length);
          return buf;
        }
      } else {
        console.warn(
          'downloadFirmaBuffer -> fetch status:',
          response.status,
          trimmed.slice(0, 120),
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('downloadFirmaBuffer -> fetch error:', msg);
    }

    const markerPublic = '/storage/v1/object/public/fotos_trazabilidad/';
    if (trimmed.includes(markerPublic)) {
      const rest = trimmed.split(markerPublic)[1]?.split('?')[0];
      if (rest) {
        try {
          const pathDecoded = decodeURIComponent(rest);
          const { data: firmaBlob, error: downloadError } =
            await supabase.storage
              .from('fotos_trazabilidad')
              .download(pathDecoded);

          if (!downloadError && firmaBlob) {
            const buf = Buffer.from(await firmaBlob.arrayBuffer());
            console.log(
              'downloadFirmaBuffer -> storage.download OK, bytes:',
              buf.length,
            );
            return buf;
          }
          console.warn(
            'downloadFirmaBuffer -> storage:',
            downloadError?.message,
          );
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn('downloadFirmaBuffer -> storage exception:', msg);
        }
      }
    }

    console.warn(
      'downloadFirmaBuffer -> sin buffer; URL parcial:',
      trimmed.slice(0, 140),
    );
    return null;
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
   * Genera el PDF "Comprobante de despacho" con tabla Concepto/Detalle,
   * firma digital del receptor y footer.
   *
   * Las evidencias fotográficas NO se incluyen en este PDF: el cliente
   * solo necesita el comprobante formal por correo. La galería de
   * fotos se ve únicamente en el Historial web (modal "Ver evidencias",
   * endpoint GET /api/rutas/:id/evidencias).
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
  }): Promise<Buffer> {
    console.log(
      'PDF generateDeliveryPDF -> firmaBuffer bytes:',
      data.firmaBuffer?.length ?? 0,
    );
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

      // ── 4) FOOTER ───────────────────────────────────────────────
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
   * Envía email de comprobante de entrega al cliente.
   *
   * Devuelve `{ ok, id?, errorMsg? }`:
   *  - `ok=true` solo si Resend confirmó con un id de correo.
   *  - `ok=false` si Resend devolvió `error` en el response (falla
   *    silenciosa típica: dominio no verificado, "to" inválido,
   *    cuenta sin saldo, etc.) o tiró excepción.
   */
  private async sendDeliveryEmail(
    emailCliente: string,
    nombreCliente: string,
    pdfBuffer: Buffer,
    rutaId: string,
  ): Promise<{ ok: boolean; id?: string; errorMsg?: string }> {
    const resend = this.resendConfig.getClient();
    const fromUsado =
      process.env.RESEND_FROM_EMAIL ||
      'Sistema LogiTrack <onboarding@resend.dev>';

    console.log(
      'CLOSE DELIVERY -> sendDeliveryEmail FROM:',
      fromUsado,
      'TO:',
      emailCliente,
    );

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

      const base64Pdf = pdfBuffer.toString('base64');

      const response = await resend.emails.send({
        from: fromUsado,
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

      // TEMP: Resend retorna { data: { id }, error }. Loggeamos completo
      // para diagnosticar por qué el correo no llega aunque "se envíe".
      console.log('RESEND EMAIL RESPONSE:', JSON.stringify(response));

      if ((response as any)?.error) {
        const err = (response as any).error;
        console.warn('RESEND EMAIL ERROR:', err);
        return {
          ok: false,
          errorMsg: err?.message || err?.name || 'error desconocido de Resend',
        };
      }

      const id = (response as any)?.data?.id ?? (response as any)?.id ?? null;
      if (!id) {
        console.warn(
          'RESEND EMAIL WARNING: respuesta sin id ni error explícito',
        );
        return { ok: false, errorMsg: 'Resend no confirmó id de envío' };
      }

      return { ok: true, id };
    } catch (error: any) {
      console.warn(
        'RESEND EMAIL EXCEPTION:',
        error?.message,
        error?.name,
        error?.statusCode,
      );
      return {
        ok: false,
        errorMsg: error?.message || 'excepción al enviar correo',
      };
    }
  }
}
