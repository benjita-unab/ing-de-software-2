import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

// Schema real de `public.camiones`:
//   id, patente*, capacidad_kg, estado (enum estado_camion:
//   DISPONIBLE | EN_RUTA | MANTENCION), activo, ultima_mantencion,
//   proxima_mantencion, created_at.
@Injectable()
export class CamionesService {
  constructor(private supabaseConfig: SupabaseConfigService) {}

  async listCamiones() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select('id, patente, capacidad_kg, estado, activo')
      .eq('activo', true)
      .order('patente', { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Error al obtener camiones: ${error.message}`,
      );
    }

    // Garantiza el contrato mínimo solicitado por la UI:
    // [{ id, patente, estado }]. Si la BD trae estado null, fallback DISPONIBLE.
    return (data || []).map((c) => ({
      id: c.id,
      patente: c.patente,
      capacidad_kg: c.capacidad_kg ?? null,
      estado: c.estado ?? 'DISPONIBLE',
    }));
  }

  async listCamionesDisponibles() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('camiones')
      .select('id, patente, capacidad_kg, estado')
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
}
