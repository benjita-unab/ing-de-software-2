import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

const VALID_TIPOS = ['ESTADO', 'EMERGENCIA'] as const;
const VALID_PRIORIDADES = ['NORMAL', 'ALTA'] as const;

@Injectable()
export class MensajesConductorService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  private validateString(value: unknown, name: string) {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      throw new BadRequestException(`${name} es obligatorio`);
    }
    return normalized;
  }

  private validateTipo(value: unknown) {
    const tipo = String(value ?? '').trim().toUpperCase();
    if (!VALID_TIPOS.includes(tipo as any)) {
      throw new BadRequestException(
        `Tipo inválido. Valores permitidos: ${VALID_TIPOS.join(', ')}`,
      );
    }
    return tipo as (typeof VALID_TIPOS)[number];
  }

  private validatePrioridad(value: unknown) {
    const prioridad = String(value ?? '').trim().toUpperCase();
    if (!VALID_PRIORIDADES.includes(prioridad as any)) {
      throw new BadRequestException(
        `Prioridad inválida. Valores permitidos: ${VALID_PRIORIDADES.join(', ')}`,
      );
    }
    return prioridad as (typeof VALID_PRIORIDADES)[number];
  }

  private validateTimestamp(value: unknown) {
    const timestamp = String(value ?? '').trim();
    if (!timestamp) {
      throw new BadRequestException('timestamp_evento es obligatorio');
    }
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('timestamp_evento no es una fecha válida');
    }
    return new Date(timestamp).toISOString();
  }

  private async ensureRutaExists(rutaId: string) {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas')
      .select('id')
      .eq('id', rutaId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaId}`);
    }
  }

  async createOrUpdateMensaje(body: {
    id: string;
    ruta_id: string;
    mensaje: string;
    tipo: string;
    prioridad: string;
    latitud?: number | null;
    longitud?: number | null;
    timestamp_evento: string;
  }) {
    const id = this.validateString(body.id, 'id');
    const rutaId = this.validateString(body.ruta_id, 'ruta_id');
    const mensaje = this.validateString(body.mensaje, 'mensaje');
    const tipo = this.validateTipo(body.tipo);
    const prioridad = this.validatePrioridad(body.prioridad);
    const timestamp_evento = this.validateTimestamp(body.timestamp_evento);

    await this.ensureRutaExists(rutaId);

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('mensajes_conductor')
      .upsert(
        {
          id,
          ruta_id: rutaId,
          mensaje,
          tipo,
          prioridad,
          latitud: body.latitud ?? null,
          longitud: body.longitud ?? null,
          timestamp_evento,
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al guardar mensaje: ${error.message}`,
      );
    }

    return data;
  }

  async listMensajes(filters: {
    ruta_id?: string;
    prioridad?: string;
    acknowledged?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();
    let query = supabase
      .from('mensajes_conductor')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.ruta_id) {
      query = query.eq('ruta_id', filters.ruta_id);
    }

    if (filters.prioridad) {
      query = query.eq('prioridad', filters.prioridad);
    }

    if (filters.acknowledged !== undefined) {
      const acknowledged = filters.acknowledged === 'true';
      query = query.eq('acknowledged', acknowledged);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `Error al listar mensajes: ${error.message}`,
      );
    }

    return data;
  }

  async acknowledgeMensaje(mensajeId: string, operatorId?: string) {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('mensajes_conductor')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', mensajeId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al reconocer mensaje: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException(`Mensaje no encontrado: ${mensajeId}`);
    }

    return data;
  }
}
