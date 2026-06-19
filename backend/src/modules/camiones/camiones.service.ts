import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { CreateCamionDto } from './dto/create-camion.dto';
import { UpdateCamionDto } from './dto/update-camion.dto';

// Schema real de `public.camiones`:
//   id, patente*, capacidad_kg, estado (enum estado_camion:
//   DISPONIBLE | EN_RUTA | MANTENCION), activo, ultima_mantencion,
//   proxima_mantencion, created_at.

const CAMION_SELECT =
  'id, patente, estado, activo, ultima_mantencion, proxima_mantencion, created_at';

@Injectable()
export class CamionesService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  private mapCamion(c: Record<string, unknown>) {
    return {
      id: c.id,
      patente: c.patente,
      capacidad_kg: c.capacidad_kg ?? null,
      estado: c.estado ?? 'DISPONIBLE',
      activo: c.activo ?? true,
      ultima_mantencion: c.ultima_mantencion ?? null,
      proxima_mantencion: c.proxima_mantencion ?? null,
      created_at: c.created_at ?? null,
    };
  }

  private normalizePatente(patente: string): string {
    return String(patente || '').trim().toUpperCase();
  }

  private normalizeDateOnly(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  }

  private todayDateOnly(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async assertPatenteUnica(patente: string, excludeId?: string) {
    const supabase = this.supabaseConfig.getClient();
    const normalized = this.normalizePatente(patente);

    const { data, error } = await supabase
      .from('camiones')
      .select('id, patente')
      .ilike('patente', normalized);

    if (error) {
      throw new BadRequestException(
        `Error al validar patente: ${error.message}`,
      );
    }

    const duplicado = (data || []).find(
      (row) => !excludeId || row.id !== excludeId,
    );

    if (duplicado) {
      throw new BadRequestException(
        `Ya existe un camión registrado con la patente ${duplicado.patente}`,
      );
    }
  }

  async listCamiones(params?: {
    page?: number;
    limit?: number;
    search?: string;
    estado?: string;
    orden?: string;
  }) {
    const supabase = this.supabaseConfig.getClient();

    let query = supabase
      .from('camiones')
      .select(CAMION_SELECT, { count: 'exact' })
      .eq('activo', true);

    if (params?.search) {
      const term = `%${params.search.trim()}%`;
      query = query.ilike('patente', term);
    }

    if (params?.estado && params.estado !== 'TODOS') {
      query = query.eq('estado', params.estado);
    }

    if (params?.orden) {
      switch (params.orden) {
        case 'patente-desc':
          query = query.order('patente', { ascending: false });
          break;
        case 'revision-proxima':
          query = query.order('proxima_mantencion', { ascending: true, nullsFirst: false });
          break;
        case 'revision-lejana':
          query = query.order('proxima_mantencion', { ascending: false, nullsFirst: false });
          break;
        case 'patente-asc':
        default:
          query = query.order('patente', { ascending: true });
          break;
      }
    } else {
      query = query.order('patente', { ascending: true });
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new BadRequestException(
        `Error al obtener camiones: ${error.message}`,
      );
    }

    const resultData = (data || []).map((c) => this.mapCamion(c));

    if (params?.page && params?.limit) {
      return {
        data: resultData,
        meta: {
          total_items: count || 0,
          total_pages: Math.ceil((count || 0) / params.limit),
          current_page: params.page,
          limit: params.limit,
        },
      };
    }

    return resultData;
  }

  async listCamionesDisponibles() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select('id, patente, estado')
      .eq('activo', true)
      .eq('estado', 'DISPONIBLE')
      .order('patente', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Error al obtener camiones disponibles: ${error.message}`,
      );
    }

    return data || [];
  }

  async getCamion(id: string) {
    if (!id) {
      throw new BadRequestException('id es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select(CAMION_SELECT)
      .eq('id', id)
      .eq('activo', true)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Error al obtener camión: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Camión no encontrado');
    }

    return this.mapCamion(data);
  }

  async createCamion(payload: CreateCamionDto) {
    const patente = this.normalizePatente(payload.patente);
    if (!patente) {
      throw new BadRequestException('La patente es obligatoria');
    }

    if (!payload.capacidad_kg || payload.capacidad_kg <= 0) {
      throw new BadRequestException('La capacidad debe ser mayor a 0');
    }

    await this.assertPatenteUnica(patente);

    const supabase = this.supabaseConfig.getClient();

    const insertRow = {
      patente,
      estado: payload.estado ?? 'DISPONIBLE',
      activo: true,
      ultima_mantencion: this.normalizeDateOnly(payload.ultima_mantencion),
      proxima_mantencion: this.normalizeDateOnly(payload.proxima_mantencion),
    };

    const { data, error } = await supabase
      .from('camiones')
      .insert([insertRow])
      .select(CAMION_SELECT)
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al crear camión: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Camión creado exitosamente',
      data: this.mapCamion(data),
    };
  }

  async updateCamion(id: string, payload: UpdateCamionDto) {
    if (!id) {
      throw new BadRequestException('id es requerido');
    }

    await this.getCamion(id);

    if (
      payload.capacidad_kg != null
      && payload.capacidad_kg <= 0
    ) {
      throw new BadRequestException('La capacidad debe ser mayor a 0');
    }

    const updateRow: Record<string, unknown> = {};

    if (payload.estado != null) {
      updateRow.estado = payload.estado;
    }
    if (payload.ultima_mantencion !== undefined) {
      updateRow.ultima_mantencion = this.normalizeDateOnly(
        payload.ultima_mantencion,
      );
    }
    if (payload.proxima_mantencion !== undefined) {
      updateRow.proxima_mantencion = this.normalizeDateOnly(
        payload.proxima_mantencion,
      );
    }

    if (Object.keys(updateRow).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .update(updateRow)
      .eq('id', id)
      .select(CAMION_SELECT)
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al actualizar camión: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Camión actualizado exitosamente',
      data: this.mapCamion(data),
    };
  }

  async registrarRevisionTecnica(id: string, proximaMantencion: string) {
    if (!id) {
      throw new BadRequestException('id es requerido');
    }

    const proxima = this.normalizeDateOnly(proximaMantencion);
    if (!proxima) {
      throw new BadRequestException('proxima_mantencion es obligatoria');
    }

    await this.getCamion(id);

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .update({
        ultima_mantencion: this.todayDateOnly(),
        proxima_mantencion: proxima,
      })
      .eq('id', id)
      .select(CAMION_SELECT)
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al registrar revisión técnica: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Revisión técnica registrada exitosamente',
      data: this.mapCamion(data),
    };
  }
}
