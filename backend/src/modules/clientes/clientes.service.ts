import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

const CLIENTE_SELECT = `
  id,
  nombre,
  rut,
  direccion,
  contacto_nombre,
  contacto_telefono,
  contacto_email,
  activo,
  usuario_id,
  created_at,
  usuarios (
    id,
    email,
    activo
  )
`;

export interface CreateClienteDto {
  nombre: string;
  rut?: string;
  /** Correo de acceso al portal (CA-01). */
  email: string;
  /** Contraseña inicial (CA-02). Obligatoria al crear. */
  password?: string;
  direccion?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  /** CA-07: estado de acceso al portal (default true). */
  accesoActivo?: boolean;
  /** Nueva contraseña en edición (opcional). */
  nuevaPassword?: string;
  contacto_email?: string;
  latitud?: number;
  longitud?: number;
}

type UsuarioPortalRow = {
  id: string;
  email: string;
  activo: boolean | null;
};

@Injectable()
export class ClientesService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  /**
   * HU-60: crea usuario CLIENTE + cliente vinculado (1:1).
   */
  async createCliente(payload: CreateClienteDto) {
    this.validateEmpresaFields(payload);
    const email = this.normalizeEmail(payload.email);
    const password = payload.password?.trim();

    if (!email) {
      throw new BadRequestException('El correo electrónico es obligatorio');
    }
    if (!password) {
      throw new BadRequestException('La contraseña es obligatoria');
    }
    if (password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const supabase = this.supabaseConfig.getClient();
    const accesoActivo = payload.accesoActivo !== false;

    await this.assertRutDisponible(supabase, payload.rut!.trim());
    await this.assertEmailDisponible(supabase, email);

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([
        {
          email,
          password,
          nombre: payload.nombre.trim(),
          rol: 'CLIENTE',
          activo: accesoActivo,
        },
      ])
      .select('id, email, activo')
      .single();

    if (usuarioError || !usuario) {
      if (/duplicate|unique|already exists/i.test(usuarioError?.message || '')) {
        throw new ConflictException('Ya existe un usuario con este correo electrónico');
      }
      throw new BadRequestException(
        `Error al crear usuario portal: ${usuarioError?.message ?? 'desconocido'}`,
      );
    }

    const insertRow = {
      nombre: payload.nombre.trim(),
      rut: payload.rut?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      contacto_nombre: payload.contacto_nombre?.trim() || null,
      contacto_telefono: payload.contacto_telefono?.trim() || null,
      contacto_email: email,
      activo: accesoActivo,
      usuario_id: usuario.id,
    };

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .insert([insertRow])
      .select(CLIENTE_SELECT)
      .single();

    if (clienteError || !cliente) {
      await supabase.from('usuarios').delete().eq('id', usuario.id);
      throw new BadRequestException(
        `Error al crear cliente: ${clienteError?.message ?? 'desconocido'}`,
      );
    }

    return {
      success: true,
      message: 'Cliente y acceso al portal creados exitosamente',
      data: this.mapClienteResponse(cliente),
    };
  }

  async listClientes(searchQuery?: string) {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase
      .from('clientes')
      .select(CLIENTE_SELECT)
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.or(
        `nombre.ilike.%${searchQuery}%,rut.ilike.%${searchQuery}%,contacto_nombre.ilike.%${searchQuery}%,contacto_email.ilike.%${searchQuery}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(
        `Error al obtener clientes: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.mapClienteResponse(row));
  }

  async getCliente(id: string) {
    if (!id) {
      throw new BadRequestException('id es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('clientes')
      .select(CLIENTE_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Cliente no encontrado: ${error?.message ?? id}`,
      );
    }

    return this.mapClienteResponse(data);
  }

  async updateCliente(id: string, payload: CreateClienteDto) {
    if (!id) throw new BadRequestException('ID es requerido');
    this.validateEmpresaFields(payload);

    const email = this.normalizeEmail(payload.email);
    if (!email) {
      throw new BadRequestException('El correo electrónico es obligatorio');
    }

    const supabase = this.supabaseConfig.getClient();
    const existente = await this.fetchClienteRaw(supabase, id);
    const accesoActivo =
      payload.accesoActivo !== undefined
        ? payload.accesoActivo !== false
        : existente.activo !== false;

    await this.assertRutDisponible(supabase, payload.rut!.trim(), id);

    let usuarioId = existente.usuario_id as string | null;

    if (!usuarioId) {
      const password = payload.nuevaPassword?.trim() || payload.password?.trim();
      if (!password) {
        throw new BadRequestException(
          'Este cliente no tiene acceso al portal. Debe indicar una contraseña para crear el usuario.',
        );
      }
      await this.assertEmailDisponible(supabase, email);
      const usuario = await this.insertUsuarioPortal(
        supabase,
        email,
        password,
        payload.nombre.trim(),
        accesoActivo,
      );
      usuarioId = usuario.id;
    } else {
      await this.assertEmailDisponible(supabase, email, usuarioId);
      const usuarioUpdate: Record<string, unknown> = {
        email,
        activo: accesoActivo,
        nombre: payload.nombre.trim(),
      };
      const nuevaPassword =
        payload.nuevaPassword?.trim() || payload.password?.trim();
      if (nuevaPassword) {
        if (nuevaPassword.length < 6) {
          throw new BadRequestException(
            'La contraseña debe tener al menos 6 caracteres',
          );
        }
        usuarioUpdate.password = nuevaPassword;
      }

      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update(usuarioUpdate)
        .eq('id', usuarioId);

      if (usuarioError) {
        throw new BadRequestException(
          `Error al actualizar usuario portal: ${usuarioError.message}`,
        );
      }
    }

    const updateRow = {
      nombre: payload.nombre.trim(),
      rut: payload.rut?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      contacto_nombre: payload.contacto_nombre?.trim() || null,
      contacto_telefono: payload.contacto_telefono?.trim() || null,
      contacto_email: email,
      activo: accesoActivo,
      usuario_id: usuarioId,
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(updateRow)
      .eq('id', id)
      .select(CLIENTE_SELECT)
      .single();

    if (error) {
      throw new BadRequestException(`Error al actualizar cliente: ${error.message}`);
    }

    return {
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: this.mapClienteResponse(data),
    };
  }

  async getHistorialDespachos(id: string) {
    const supabase = this.supabaseConfig.getClient();

    const { data: rutas, error } = await supabase
      .from('rutas')
      .select('id, estado, created_at, destino')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return rutas || [];
  }

  /**
   * HU-60: plantillas de ruta adjudicadas a un cliente.
   */
  async getRutasPlantillaPorCliente(clienteId: string) {
    if (!clienteId?.trim()) {
      throw new BadRequestException('clienteId es requerido');
    }

    await this.getCliente(clienteId);

    const supabase = this.supabaseConfig.getClient();
    const { data, error } = await supabase
      .from('rutas_plantilla')
      .select(
        `
        id,
        nombre,
        origen,
        destino,
        distancia_estimada,
        tiempo_estimado,
        origen_lat,
        origen_lng,
        destino_lat,
        destino_lng,
        activa,
        cliente_id,
        fecha_creacion,
        fecha_actualizacion
      `,
      )
      .eq('cliente_id', clienteId)
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Error al obtener plantillas del cliente: ${error.message}`,
      );
    }

    return {
      data: (data || []).map((row) => ({
        id: row.id,
        nombre: row.nombre,
        origen: row.origen,
        destino: row.destino,
        distanciaEstimada:
          row.distancia_estimada != null ? Number(row.distancia_estimada) : null,
        tiempoEstimado:
          row.tiempo_estimado != null ? Number(row.tiempo_estimado) : null,
        origenLat: row.origen_lat ?? null,
        origenLng: row.origen_lng ?? null,
        destinoLat: row.destino_lat ?? null,
        destinoLng: row.destino_lng ?? null,
        activa: row.activa !== false,
        clienteId: row.cliente_id ?? null,
      })),
      total: data?.length ?? 0,
    };
  }

  private validateEmpresaFields(payload: CreateClienteDto) {
    if (!payload?.nombre?.trim()) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!payload?.rut?.trim()) {
      throw new BadRequestException('El RUT es obligatorio');
    }
  }

  private normalizeEmail(email?: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private mapClienteResponse(row: Record<string, unknown>) {
    const usuarioRaw = row.usuarios;
    const usuario = Array.isArray(usuarioRaw)
      ? (usuarioRaw[0] as UsuarioPortalRow | undefined)
      : (usuarioRaw as UsuarioPortalRow | undefined);

    const tieneAcceso = Boolean(row.usuario_id && usuario?.email);

    return {
      id: row.id,
      nombre: row.nombre,
      rut: row.rut,
      direccion: row.direccion,
      contacto_nombre: row.contacto_nombre,
      contacto_telefono: row.contacto_telefono,
      contacto_email: row.contacto_email,
      activo: row.activo,
      usuario_id: row.usuario_id,
      created_at: row.created_at,
      accesoPortal: {
        tieneAcceso,
        email: usuario?.email ?? row.contacto_email ?? null,
        activo: usuario?.activo ?? row.activo ?? null,
        usuarioId: usuario?.id ?? row.usuario_id ?? null,
      },
    };
  }

  private async fetchClienteRaw(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    id: string,
  ) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, activo')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return data;
  }

  private async assertRutDisponible(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    rut: string,
    excludeId?: string,
  ) {
    let query = supabase.from('clientes').select('id').eq('rut', rut);
    if (excludeId) query = query.neq('id', excludeId);
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      throw new BadRequestException('Ya existe un cliente registrado con este RUT');
    }
  }

  private async assertEmailDisponible(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    email: string,
    excludeUsuarioId?: string,
  ) {
    let query = supabase.from('usuarios').select('id').ilike('email', email);
    if (excludeUsuarioId) query = query.neq('id', excludeUsuarioId);
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      throw new ConflictException('Ya existe un usuario con este correo electrónico');
    }
  }

  private async insertUsuarioPortal(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    email: string,
    password: string,
    nombre: string,
    activo: boolean,
  ): Promise<UsuarioPortalRow> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          email,
          password,
          nombre,
          rol: 'CLIENTE',
          activo,
        },
      ])
      .select('id, email, activo')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        `Error al crear usuario portal: ${error?.message ?? 'desconocido'}`,
      );
    }

    return data;
  }
}
