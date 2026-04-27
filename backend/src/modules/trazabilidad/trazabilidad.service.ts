import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

export type TraceabilityEventInput = {
  id: string;
  etapa: string;
  foto_uri: string | null;
  latitud: number;
  longitud: number;
  timestamp_evento: string;
};

@Injectable()
export class TrazabilidadService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async createEvent(data: TraceabilityEventInput) {
    const supabase = this.supabaseConfig.getClient();

    const { data: row, error } = await supabase
      .from('traceability_events')
      .upsert(
        {
          id: data.id,
          etapa: data.etapa,
          foto_uri: data.foto_uri,
          latitud: data.latitud,
          longitud: data.longitud,
          timestamp_evento: data.timestamp_evento,
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (error) {
      console.error('ERROR SUPABASE TRAZABILIDAD:', error);

      throw new BadRequestException(`Error al registrar evento: ${error.message}`);
    }

    return row;
  }
}
