import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

export type TraceabilityEventInput = {
  id: string;
  etapa: string;
  foto_uri: string | null;
  latitud: number;
  longitud: number;
  timestamp_evento: string;
  ruta_id?: string | null;
  /** EVIDENCIA | FICHA_DESPACHO — opcional si la columna no existe en BD */
  tipo?: string | null;
};

// Códigos de error de PostgREST cuando una columna no existe en la tabla.
// Cubren versiones 42703 (postgres) y PGRST204 (postgrest) por seguridad.
const COLUMN_NOT_FOUND_CODES = new Set(['42703', 'PGRST204']);

@Injectable()
export class TrazabilidadService {
  // Cache para no reintentar incluir `ruta_id` después de saber que la
  // columna no existe en la BD. Se reinicia al reiniciar el backend.
  private rutaIdColumnAvailable = true;
  private tipoColumnAvailable = true;

  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  private resolveTipo(data: TraceabilityEventInput): string | null {
    const explicit = data.tipo != null ? String(data.tipo).trim() : '';
    if (explicit) return explicit;

    const etapaUpper = String(data.etapa || '').trim().toUpperCase();
    if (etapaUpper === 'HOJA_DESPACHO') return 'FICHA_DESPACHO';
    if (etapaUpper) return 'EVIDENCIA';
    return null;
  }

  async createEvent(data: TraceabilityEventInput) {
    const supabase = this.supabaseConfig.getClient();

    const rutaIdTrim = data.ruta_id?.trim() || null;
    if (!rutaIdTrim) {
      console.warn(
        'TRAZABILIDAD -> createEvent sin ruta_id en payload; id=',
        data.id,
        'etapa=',
        data.etapa,
      );
    }

    const tipoResolved = this.resolveTipo(data);

    const baseRow: Record<string, unknown> = {
      id: data.id,
      etapa: data.etapa,
      foto_uri: data.foto_uri,
      latitud: data.latitud,
      longitud: data.longitud,
      timestamp_evento: data.timestamp_evento,
    };

    // Solo intentamos persistir ruta_id si vino en el payload Y todavía
    // no descubrimos que la columna no existe en esta instancia.
    if (rutaIdTrim && this.rutaIdColumnAvailable) {
      baseRow.ruta_id = rutaIdTrim;
    }

    if (tipoResolved && this.tipoColumnAvailable) {
      baseRow.tipo = tipoResolved;
    }

    let { data: row, error } = await supabase
      .from('traceability_events')
      .upsert(baseRow, { onConflict: 'id' })
      .select()
      .single();

    // Si la columna ruta_id aún no se migró, recordamos y reintentamos
    // sin el campo. Así el servicio sigue trabajando hasta que la
    // migración SQL se aplique.
    if (
      error &&
      'ruta_id' in baseRow &&
      COLUMN_NOT_FOUND_CODES.has((error as { code?: string }).code || '')
    ) {
      console.warn(
        'traceability_events.ruta_id no existe todavía: descarto el campo y reintento. ' +
          'Aplica la migración SQL para habilitar el vínculo directo.',
      );
      this.rutaIdColumnAvailable = false;
      delete baseRow.ruta_id;

      const retry = await supabase
        .from('traceability_events')
        .upsert(baseRow, { onConflict: 'id' })
        .select()
        .single();
      row = retry.data;
      error = retry.error;
    }

    if (
      error &&
      'tipo' in baseRow &&
      COLUMN_NOT_FOUND_CODES.has((error as { code?: string }).code || '')
    ) {
      console.warn(
        'traceability_events.tipo no existe: omitiendo tipo y reintentando.',
      );
      this.tipoColumnAvailable = false;
      delete baseRow.tipo;

      const retryTipo = await supabase
        .from('traceability_events')
        .upsert(baseRow, { onConflict: 'id' })
        .select()
        .single();
      row = retryTipo.data;
      error = retryTipo.error;
    }

    if (error) {
      console.error('ERROR SUPABASE TRAZABILIDAD:', error);
      throw new BadRequestException(`Error al registrar evento: ${error.message}`);
    }

    if (row && 'ruta_id' in baseRow) {
      this.rutaIdColumnAvailable = true;
    }
    if (row && 'tipo' in baseRow) {
      this.tipoColumnAvailable = true;
    }

    console.log('INSERT traceability_events resultado:', {
      id: row?.id,
      etapa: row?.etapa,
      tipo: row?.tipo,
      ruta_id: row?.ruta_id,
      foto_uri: row?.foto_uri,
    });

    // HU-20: si el evento es Hoja/Ficha de Despacho, vincularlo a la ruta
    // actualizando `rutas.ficha_despacho_url` con la URL pública del archivo.
    // No bloqueamos el insert de trazabilidad si esta actualización falla
    // (la ficha sigue en Storage y el evento queda persistido).
    await this.maybeLinkFichaDespachoToRuta({
      ...data,
      ruta_id: rutaIdTrim,
      tipo: tipoResolved,
    });

    return row;
  }

  /**
   * Si el evento corresponde a la ficha de despacho física (etapa
   * HOJA_DESPACHO o tipo FICHA_DESPACHO), persiste la URL pública del
   * archivo en `rutas.ficha_despacho_url`. Si falta `ruta_id`, registra
   * un warning y no bloquea: el evento ya quedó en BD/Storage.
   */
  private async maybeLinkFichaDespachoToRuta(
    data: TraceabilityEventInput,
  ): Promise<void> {
    const etapaUpper = String(data.etapa || '').trim().toUpperCase();
    const tipoUpper = String(data.tipo || '').trim().toUpperCase();
    const esFicha =
      etapaUpper === 'HOJA_DESPACHO' || tipoUpper === 'FICHA_DESPACHO';

    if (!esFicha) return;

    const rutaId = data.ruta_id?.trim();
    if (!rutaId) {
      console.warn(
        'TRAZABILIDAD -> evento de ficha de despacho sin ruta_id; no se vincula a la ruta. ' +
          `etapa=${data.etapa} tipo=${data.tipo ?? 'null'}`,
      );
      return;
    }

    const fotoPath = String(data.foto_uri || '').trim();
    if (!fotoPath) {
      console.warn(
        'TRAZABILIDAD -> evento de ficha de despacho sin foto_uri; no se actualiza ficha_despacho_url para ruta',
        rutaId,
      );
      return;
    }

    try {
      const publicUrl = this.supabaseConfig.getPublicUrl(
        'fotos_trazabilidad',
        fotoPath,
      );
      if (!publicUrl) {
        console.warn(
          'TRAZABILIDAD -> getPublicUrl vacío para foto_uri',
          fotoPath,
        );
        return;
      }

      const supabase = this.supabaseConfig.getClient();
      const { error: updateError } = await supabase
        .from('rutas')
        .update({ ficha_despacho_url: publicUrl })
        .eq('id', rutaId);

      if (updateError) {
        console.warn(
          'TRAZABILIDAD -> no se pudo actualizar rutas.ficha_despacho_url:',
          updateError.message,
        );
      } else {
        console.log(
          'TRAZABILIDAD -> rutas.ficha_despacho_url actualizada para ruta',
          rutaId,
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        'TRAZABILIDAD -> excepción al vincular ficha a la ruta:',
        msg,
      );
    }
  }
}
