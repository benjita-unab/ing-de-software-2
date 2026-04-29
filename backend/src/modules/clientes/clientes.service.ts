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
      throw new BadRequestException('El nombre es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

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

  async listClientes() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('clientes')
      .select(
        'id, nombre, rut, direccion, contacto_nombre, contacto_telefono, contacto_email, activo, created_at',
      )
      .order('created_at', { ascending: false });

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
}
