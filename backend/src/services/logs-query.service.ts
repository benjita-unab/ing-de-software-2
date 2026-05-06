import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../config/supabase.types';

/**
 * Servicio para consultar y gestionar logs almacenados en Supabase
 * Proporciona métodos para:
 * - Recuperar logs filtrados por nivel, contexto o rango de fechas
 * - Limpiar logs antiguos
 * - Obtener estadísticas de logs
 */
@Injectable()
export class LogsQueryService {
  private supabaseClient = createClient<Database>(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
  );

  /**
   * Obtener logs con filtros opcionales
   * @param filters - Filtros: level, context, limit, days (últimos N días)
   */
  async getLogs(filters?: {
    level?: string;
    context?: string;
    limit?: number;
    days?: number;
  }) {
    let query = this.supabaseClient.from('system_logs').select('*');

    // Filtro por nivel
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }

    // Filtro por contexto
    if (filters?.context) {
      query = query.ilike('context', `%${filters.context}%`);
    }

    // Filtro por rango de fechas (últimos N días)
    if (filters?.days) {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - filters.days);
      query = query.gte('timestamp', dateFrom.toISOString());
    }

    // Ordenar por timestamp descendente (más recientes primero)
    query = query.order('timestamp', { ascending: false });

    // Limitar resultados
    const limit = filters?.limit || 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error consultando logs: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtener logs de error únicamente
   */
  async getErrors(limit = 50, days = 7) {
    return this.getLogs({
      level: 'error',
      limit,
      days,
    });
  }

  /**
   * Obtener logs por nivel específico
   */
  async getLogsByLevel(level: string, limit = 100) {
    return this.getLogs({
      level,
      limit,
    });
  }

  /**
   * Obtener logs por contexto/servicio
   */
  async getLogsByContext(context: string, limit = 100) {
    return this.getLogs({
      context,
      limit,
    });
  }

  /**
   * Obtener resumen estadístico de logs
   */
  async getLogStatistics(days = 7) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Obtenemos los niveles de la base de datos sin group_by
    const { data, error } = await this.supabaseClient
      .from('system_logs')
      .select('level')
      .gte('timestamp', dateFrom.toISOString());

    if (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }

    // Agrupamos y contamos en memoria (Soluciona el TS2339)
    const stats = (data || []).reduce((acc, log: any) => {
      const levelStr = String(log.level || 'unknown');
      acc[levelStr] = (acc[levelStr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  }

  /**
   * Limpiar logs más antiguos de N días
   * ADVERTENCIA: Esta operación es destructiva
   */
  async cleanOldLogs(daysOld: number): Promise<number> {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysOld);

    const { data, error } = await this.supabaseClient
      .from('system_logs')
      .delete()
      .select() // Requerido en v2 para que retorne la data eliminada
      .lt('timestamp', dateLimit.toISOString());

    if (error) {
      throw new Error(`Error limpiando logs: ${error.message}`);
    }

    // Validación segura para TypeScript (Soluciona el TS18047)
    return data ? data.length : 0;
  }

  /**
   * Buscar logs por mensaje (búsqueda de texto)
   */
  async searchLogs(searchText: string, limit = 50) {
    const { data, error } = await this.supabaseClient
      .from('system_logs')
      .select('*')
      .ilike('message', `%${searchText}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error buscando logs: ${error.message}`);
    }

    return data;
  }
}