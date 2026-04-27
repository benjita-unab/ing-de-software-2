import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';

@Injectable()
export class IncidenciasService {
  constructor(private readonly supabaseConfig: SupabaseConfigService) {}

  async listIncidencias() {
    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('incidencias')
      .select(
        `
        *,
        conductores (
          id,
          usuarios ( nombre )
        ),
        rutas (
          id,
          camiones ( id, patente )
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `Error al listar incidencias: ${error.message}`,
      );
    }

    return { success: true, data };
  }

  async acknowledgeIncidencia(incidenciaId: string, operatorId: string) {
    if (!incidenciaId) {
      throw new BadRequestException('incidenciaId es requerido');
    }
    if (!operatorId) {
      throw new BadRequestException('operatorId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('incidencias')
      .update({
        estado: 'EN_GESTION',
        atendido_por: operatorId,
        fecha_atencion: new Date().toISOString(),
      })
      .eq('id', incidenciaId)
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al actualizar incidencia: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    return { success: true, data };
  }

  async resolveIncidencia(incidenciaId: string) {
    if (!incidenciaId) {
      throw new BadRequestException('incidenciaId es requerido');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data, error } = await supabase
      .from('incidencias')
      .update({
        estado: 'RESUELTO',
        fecha_resolucion: new Date().toISOString(),
      })
      .eq('id', incidenciaId)
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al resolver incidencia: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    return { success: true, data };
  }
}
