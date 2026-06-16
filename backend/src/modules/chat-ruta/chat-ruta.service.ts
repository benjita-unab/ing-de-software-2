import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';
import { CreateChatMensajeDto } from './dto/create-chat-mensaje.dto';

type RemitenteTipo = 'OPERADOR' | 'CONDUCTOR';

interface RutaRow {
  id: string;
  nombre_ruta?: string | null;
  origen?: string | null;
  destino?: string | null;
  conductor_id?: string | null;
  conductores?:
    | { id?: string; rut?: string | null }
    | { id?: string; rut?: string | null }[]
    | null;
  camiones?:
    | { patente?: string | null }
    | { patente?: string | null }[]
    | null;
}

interface ChatMensajeRow {
  id: string;
  ruta_id: string;
  remitente_tipo: RemitenteTipo;
  remitente_id: string;
  contenido: string;
  created_at: string;
  leido_at?: string | null;
}

export interface ConversacionDto {
  ruta_id: string;
  codigo_ruta: string;
  conductor: string | null;
  patente: string | null;
  ultimo_mensaje: string | null;
  fecha_ultimo_mensaje: string | null;
  cantidad_no_leidos: number;
}

@Injectable()
export class ChatRutaService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  private buildCodigoRuta(ruta: RutaRow): string {
    if (ruta.nombre_ruta) return ruta.nombre_ruta;
    const origen = String(ruta.origen ?? '').trim();
    const destino = String(ruta.destino ?? '').trim();
    if (origen && destino) return `${origen} → ${destino}`;
    if (destino) return destino;
    if (origen) return origen;
    return `Ruta ${String(ruta.id).substring(0, 8)}`;
  }

  private extractConductor(ruta: RutaRow): string | null {
    const raw = ruta.conductores;
    const conductor = Array.isArray(raw) ? raw[0] : raw;
    const rut = String(conductor?.rut ?? '').trim();
    return rut || null;
  }

  private extractPatente(ruta: RutaRow): string | null {
    const raw = ruta.camiones;
    const camion = Array.isArray(raw) ? raw[0] : raw;
    const patente = String(camion?.patente ?? '').trim();
    return patente || null;
  }

  private remitenteTipoForUser(user: AuthenticatedUser): RemitenteTipo {
    if (user.role === 'CONDUCTOR') return 'CONDUCTOR';
    if (user.role === 'OPERADOR' || user.role === 'ADMIN') return 'OPERADOR';
    throw new ForbiddenException('Rol no autorizado para chat.');
  }

  private remitenteIdForUser(user: AuthenticatedUser): string {
    if (user.role === 'CONDUCTOR') {
      const conductorId = user.conductorId?.trim();
      if (!conductorId) {
        throw new ForbiddenException(
          'Sesión de conductor sin vínculo. Vuelve a iniciar sesión.',
        );
      }
      return conductorId;
    }
    return user.id;
  }

  private tipoOpuesto(tipo: RemitenteTipo): RemitenteTipo {
    return tipo === 'OPERADOR' ? 'CONDUCTOR' : 'OPERADOR';
  }

  private async fetchRuta(rutaId: string): Promise<RutaRow> {
    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, conductor_id, conductores(id, rut), camiones(patente)',
      )
      .eq('id', rutaId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Ruta no encontrada: ${rutaId}`);
    }
    return data as RutaRow;
  }

  private async assertRutaAccess(user: AuthenticatedUser, ruta: RutaRow) {
    if (user.role === 'CONDUCTOR') {
      const scoped = user.conductorId?.trim();
      if (!scoped) {
        throw new ForbiddenException(
          'Sesión de conductor sin vínculo. Vuelve a iniciar sesión.',
        );
      }
      if (String(ruta.conductor_id ?? '') !== scoped) {
        throw new ForbiddenException('No tienes acceso a esta ruta.');
      }
    }
  }

  async listConversaciones(user: AuthenticatedUser): Promise<ConversacionDto[]> {
    const supabase = this.supabaseConfig.getClient();
    const miTipo = this.remitenteTipoForUser(user);

    let rutasQuery = supabase
      .from('rutas')
      .select(
        'id, nombre_ruta, origen, destino, estado, conductor_id, conductores(id, rut), camiones(patente)',
      );

    if (user.role === 'CONDUCTOR') {
      const scoped = user.conductorId?.trim();
      if (!scoped) {
        throw new ForbiddenException(
          'Sesión de conductor sin vínculo. Vuelve a iniciar sesión.',
        );
      }
      rutasQuery = rutasQuery.eq('conductor_id', scoped);
    }

    const { data: rutas, error: rutasError } = await rutasQuery;
    if (rutasError) {
      throw new InternalServerErrorException(
        `Error al cargar rutas: ${rutasError.message}`,
      );
    }

    const rutasMap = new Map(
      (rutas ?? []).map((ruta) => [ruta.id as string, ruta as RutaRow]),
    );
    const rutaIds = [...rutasMap.keys()];
    if (rutaIds.length === 0) return [];

    const { data: mensajes, error: mensajesError } = await supabase
      .from('chat_mensajes_ruta')
      .select('*')
      .in('ruta_id', rutaIds)
      .order('created_at', { ascending: false });

    if (mensajesError) {
      throw new InternalServerErrorException(
        `Error al cargar conversaciones: ${mensajesError.message}`,
      );
    }

    const porRuta = new Map<string, ChatMensajeRow[]>();
    for (const row of (mensajes ?? []) as ChatMensajeRow[]) {
      const list = porRuta.get(row.ruta_id) ?? [];
      list.push(row);
      porRuta.set(row.ruta_id, list);
    }

    const conversaciones: ConversacionDto[] = [];
    const rutasIncluidas = new Set<string>();

    for (const [rutaId, msgs] of porRuta.entries()) {
      const ruta = rutasMap.get(rutaId);
      if (!ruta || msgs.length === 0) continue;

      const ultimo = msgs[0];
      const noLeidos = msgs.filter(
        (m) => !m.leido_at && m.remitente_tipo !== miTipo,
      ).length;

      rutasIncluidas.add(rutaId);
      conversaciones.push({
        ruta_id: rutaId,
        codigo_ruta: this.buildCodigoRuta(ruta),
        conductor: this.extractConductor(ruta),
        patente: this.extractPatente(ruta),
        ultimo_mensaje: ultimo.contenido,
        fecha_ultimo_mensaje: ultimo.created_at,
        cantidad_no_leidos: noLeidos,
      });
    }

    const estadosTerminales = new Set([
      'ENTREGADO',
      'CANCELADO',
      'COMPLETADO',
      'entregado',
      'cancelada',
    ]);

    // Operador puede iniciar chat en rutas activas aún sin mensajes.
    if (user.role === 'OPERADOR' || user.role === 'ADMIN') {
      for (const ruta of rutasMap.values()) {
        if (rutasIncluidas.has(ruta.id)) continue;
        const estado = String((ruta as { estado?: string }).estado ?? '').trim();
        if (estado && estadosTerminales.has(estado)) continue;
        conversaciones.push({
          ruta_id: ruta.id,
          codigo_ruta: this.buildCodigoRuta(ruta),
          conductor: this.extractConductor(ruta),
          patente: this.extractPatente(ruta),
          ultimo_mensaje: null,
          fecha_ultimo_mensaje: null,
          cantidad_no_leidos: 0,
        });
      }
    }

    conversaciones.sort((a, b) => {
      const ta = new Date(a.fecha_ultimo_mensaje ?? 0).getTime();
      const tb = new Date(b.fecha_ultimo_mensaje ?? 0).getTime();
      if (ta !== tb) return tb - ta;
      return a.codigo_ruta.localeCompare(b.codigo_ruta, 'es');
    });

    return conversaciones;
  }

  async listMensajes(user: AuthenticatedUser, rutaId: string) {
    const ruta = await this.fetchRuta(rutaId);
    await this.assertRutaAccess(user, ruta);

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('chat_mensajes_ruta')
      .select('*')
      .eq('ruta_id', rutaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(
        `Error al cargar mensajes: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async createMensaje(
    user: AuthenticatedUser,
    rutaId: string,
    dto: CreateChatMensajeDto,
  ) {
    const contenido = String(dto.contenido ?? '').trim();
    if (!contenido) {
      throw new BadRequestException('contenido es obligatorio');
    }

    const ruta = await this.fetchRuta(rutaId);
    await this.assertRutaAccess(user, ruta);

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('chat_mensajes_ruta')
      .insert({
        ruta_id: rutaId,
        remitente_tipo: this.remitenteTipoForUser(user),
        remitente_id: this.remitenteIdForUser(user),
        contenido,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al enviar mensaje: ${error.message}`,
      );
    }

    return data;
  }

  async marcarLeidos(user: AuthenticatedUser, rutaId: string) {
    const ruta = await this.fetchRuta(rutaId);
    await this.assertRutaAccess(user, ruta);

    const supabase = this.supabaseConfig.getClient();
    const ahora = new Date().toISOString();
    const tipoLeer = this.tipoOpuesto(this.remitenteTipoForUser(user));

    const { data, error } = await supabase
      .from('chat_mensajes_ruta')
      .update({ leido_at: ahora })
      .eq('ruta_id', rutaId)
      .eq('remitente_tipo', tipoLeer)
      .is('leido_at', null)
      .select('id');

    if (error) {
      throw new InternalServerErrorException(
        `Error al marcar mensajes como leídos: ${error.message}`,
      );
    }

    return { updated: data?.length ?? 0 };
  }
}
