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
      console.error('Error al crear/actualizar mensaje de conductor:', error);
      throw new InternalServerErrorException(
        `No se pudo guardar el mensaje: ${error.message}`,
      );
    }

    return { success: true, data };
  }

  async listMensajes(query: {
    ruta_id?: string;
    prioridad?: string;
    acknowledged?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();
    const builder = supabase
      .from('mensajes_conductor')
      .select(
        `
        *,
        rutas (
          id,
          origen,
          destino,
          estado,
          camion_id,
          camiones ( id, patente )
        )
      `,
      )
      .order('timestamp_evento', { ascending: false });

    if (query.ruta_id) {
      builder.eq('ruta_id', String(query.ruta_id).trim());
    }
    if (query.prioridad) {
      const prioridad = String(query.prioridad).trim().toUpperCase();
      if (VALID_PRIORIDADES.includes(prioridad as any)) {
        builder.eq('prioridad', prioridad);
      }
    }
    if (query.acknowledged !== undefined) {
      const acknowledgedRaw = String(query.acknowledged).trim().toLowerCase();
      if (acknowledgedRaw === 'true' || acknowledgedRaw === 'false') {
        builder.eq('acknowledged', acknowledgedRaw === 'true');
      }
    }

    const { data, error } = await builder;

    if (error) {
      console.error('Error al listar mensajes de conductor:', error);
      throw new InternalServerErrorException(
        `Error al listar mensajes de conductor: ${error.message}`,
      );
    }

    return { success: true, data };
  }

  async acknowledgeMensaje(id: string, operatorId?: string) {
    const mensajeId = this.validateString(id, 'id');

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
      console.error('Error al acusar mensaje de conductor:', error);
      throw new InternalServerErrorException(
        `No se pudo acusar el mensaje: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Mensaje de conductor no encontrado');
    }

    return { success: true, data };
  }
}
