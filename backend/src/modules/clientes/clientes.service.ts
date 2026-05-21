import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

// Schema real de `public.clientes`:
//   nombre*, rut, direccion, contacto_nombre,
//   contacto_telefono, contacto_email, activo, created_at.
// La tabla NO tiene latitud/longitud: si llegan, se descartan
// silenciosamente para no romper el insert por columnas inexistentes.
export interface CreateClienteDto {
  nombre: string;
  rut?: string;
  direccion?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  // Campos heredados de UI antigua: se ignoran a propósito.
  latitud?: number;
  longitud?: number;
}

@Injectable()
export class ClientesService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  async createCliente(payload: CreateClienteDto) {
    if (!payload?.nombre?.trim()) {
      throw new BadRequestException('El nombre es obligatorio');
    }
    if (!payload?.rut?.trim()) {
      throw new BadRequestException('El RUT es obligatorio');
    }

    const supabase = this.supabaseConfig.getClient();

    // Check for duplicate RUT
    if (payload.rut) {
      const { data: existing } = await supabase
        .from('clientes')
        .select('id')
        .eq('rut', payload.rut.trim())
        .single();
      
      if (existing) {
        throw new BadRequestException('Ya existe un cliente registrado con este RUT');
      }
    }

    const insertRow = {
      nombre: payload.nombre.trim(),
      rut: payload.rut?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      contacto_nombre: payload.contacto_nombre?.trim() || null,
      contacto_telefono: payload.contacto_telefono?.trim() || null,
      contacto_email: payload.contacto_email?.trim() || null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert([insertRow])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al crear cliente: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Cliente creado exitosamente',
      data,
    };
  }

  async listClientes(searchQuery?: string) {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase
      .from('clientes')
      .select(
        'id, nombre, rut, direccion, contacto_nombre, contacto_telefono, contacto_email, activo, created_at',
      )
      .order('created_at', { ascending: false });

    if (searchQuery) {
      // Búsqueda por nombre, rut o contacto
      query = query.or(`nombre.ilike.%${searchQuery}%,rut.ilike.%${searchQuery}%,contacto_nombre.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(
        `Error al obtener clientes: ${error.message}`,
      );
    }

    return data || [];
  }

  async getCliente(id: string) {
    if (!id) {
      throw new BadRequestException('id es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('clientes')
      .select(
        'id, nombre, rut, direccion, contacto_nombre, contacto_telefono, contacto_email, activo, created_at',
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Cliente no encontrado: ${error?.message ?? id}`,
      );
    }

    return data;
  }

  async updateCliente(id: string, payload: CreateClienteDto) {
    if (!id) throw new BadRequestException('ID es requerido');
    if (!payload?.nombre?.trim()) throw new BadRequestException('El nombre es obligatorio');
    if (!payload?.rut?.trim()) throw new BadRequestException('El RUT es obligatorio');

    const supabase = this.supabaseConfig.getClient();

    // Check for duplicate RUT in other clients
    if (payload.rut) {
      const { data: existing } = await supabase
        .from('clientes')
        .select('id')
        .eq('rut', payload.rut.trim())
        .neq('id', id)
        .single();
      
      if (existing) {
        throw new BadRequestException('Ya existe otro cliente registrado con este RUT');
      }
    }

    const updateRow = {
      nombre: payload.nombre.trim(),
      rut: payload.rut?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      contacto_nombre: payload.contacto_nombre?.trim() || null,
      contacto_telefono: payload.contacto_telefono?.trim() || null,
      contacto_email: payload.contacto_email?.trim() || null,
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(updateRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error al actualizar cliente: ${error.message}`);
    }

    return {
      success: true,
      message: 'Cliente actualizado exitosamente',
      data,
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
      // Si falla devolvemos un arreglo vacío temporalmente.
      return [];
    }

    return rutas || [];
  }
}
