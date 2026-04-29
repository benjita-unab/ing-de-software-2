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
};

// Códigos de error de PostgREST cuando una columna no existe en la tabla.
// Cubren versiones 42703 (postgres) y PGRST204 (postgrest) por seguridad.
const COLUMN_NOT_FOUND_CODES = new Set(['42703', 'PGRST204']);

@Injectable()
export class TrazabilidadService {
  // Cache para no reintentar incluir `ruta_id` después de saber que la
  // columna no existe en la BD. Se reinicia al reiniciar el backend.
  private rutaIdColumnAvailable = true;

  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async createEvent(data: TraceabilityEventInput) {
    const supabase = this.supabaseConfig.getClient();

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
    if (data.ruta_id && this.rutaIdColumnAvailable) {
      baseRow.ruta_id = data.ruta_id;
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

    if (error) {
      console.error('ERROR SUPABASE TRAZABILIDAD:', error);
      throw new BadRequestException(`Error al registrar evento: ${error.message}`);
    }

    return row;
  }
}
