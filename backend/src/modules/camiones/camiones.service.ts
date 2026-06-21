import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { CreateCamionDto } from './dto/create-camion.dto';
import { UpdateCamionDto } from './dto/update-camion.dto';

// Schema real de `public.camiones`:
//   id, patente*, slots, slots_utilizados, talla, estado (enum estado_camion:
//   DISPONIBLE | EN_RUTA | MANTENCION), activo, ultima_mantencion,
//   proxima_mantencion, created_at.

const CAMION_SELECT =
  'id, patente, slots, slots_utilizados, talla, estado, activo, ultima_mantencion, proxima_mantencion, created_at';

@Injectable()
export class CamionesService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  private mapCamion(c: Record<string, unknown>) {
    const slots = (c.slots as number) ?? 0;
    const slots_utilizados = (c.slots_utilizados as number) ?? 0;
    const porcentaje_ocupacion = slots > 0 ? Math.round((slots_utilizados / slots) * 100) : 0;

    return {
      id: c.id,
      patente: c.patente,
      slots: c.slots ?? null,
      slots_utilizados,
      porcentaje_ocupacion,
      talla: c.talla ?? 'DESCONOCIDO',
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

  private calcularTalla(slots: number): string {
    if (slots <= 32) return 'CHICO';
    if (slots <= 64) return 'MEDIANO';
    return 'GRANDE';
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

  async listCamiones() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select(CAMION_SELECT)
      .eq('activo', true)
      .order('patente', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Error al obtener camiones: ${error.message}`,
      );
    }

    return (data || []).map((c) => this.mapCamion(c));
  }

  async listCamionesDisponibles() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select('id, patente, slots, slots_utilizados, talla, estado')
      .eq('activo', true)
      .eq('estado', 'DISPONIBLE')
      .order('patente', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Error al obtener camiones disponibles: ${error.message}`,
      );
    }

    return (data || []).map((c) => {
      const slots = (c.slots as number) ?? 0;
      const slots_utilizados = (c.slots_utilizados as number) ?? 0;
      const porcentaje_ocupacion = slots > 0 ? Math.round((slots_utilizados / slots) * 100) : 0;
      return {
        ...c,
        slots_utilizados,
        porcentaje_ocupacion
      };
    });
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

    if (!payload.slots || payload.slots <= 0) {
      throw new BadRequestException('Los slots deben ser mayores a 0');
    }
    if (payload.slots > 96) {
      throw new BadRequestException('La capacidad máxima de un camión es de 96 slots');
    }

    await this.assertPatenteUnica(patente);

    const supabase = this.supabaseConfig.getClient();

    const talla = this.calcularTalla(payload.slots);

    const insertRow = {
      patente,
      slots: payload.slots,
      slots_utilizados: 0,
      talla,
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

    const currentCamion = await this.getCamion(id);

    if (
      payload.slots != null
      && payload.slots <= 0
    ) {
      throw new BadRequestException('Los slots deben ser mayores a 0');
    }
    if (payload.slots != null && payload.slots > 96) {
      throw new BadRequestException('La capacidad máxima de un camión es de 96 slots');
    }

    if (payload.slots_utilizados != null && payload.slots_utilizados < 0) {
      throw new BadRequestException('Los slots utilizados no pueden ser negativos');
    }

    const updateRow: Record<string, unknown> = {};

    if (payload.slots != null) {
      updateRow.slots = payload.slots;
      updateRow.talla = this.calcularTalla(payload.slots);
    }
    if (payload.slots_utilizados != null) {
      const maxSlots = payload.slots ?? (currentCamion.slots as number) ?? 96;
      if (payload.slots_utilizados > maxSlots) {
        throw new BadRequestException(`Los slots utilizados (${payload.slots_utilizados}) no pueden superar la capacidad total (${maxSlots})`);
      }
      updateRow.slots_utilizados = payload.slots_utilizados;
    }
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
