/**
 * Tipos TypeScript para Supabase
 * Estos tipos definen la estructura de las tablas de la base de datos
 * Generados manualmente basados en el esquema actual
 */

export interface Database {
  public: {
    Tables: {
      system_logs: {
        Row: {
          id: string;
          timestamp: string;
          level: string;
          message: string;
          context: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          timestamp: string;
          level: string;
          message: string;
          context?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          timestamp?: string;
          level?: string;
          message?: string;
          context?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
    };
  };
}

/**
 * Tipos para consultas y filtros de logs
 */

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'silly';
  message: string;
  context: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface LogFilter {
  level?: string;
  context?: string;
  limit?: number;
  days?: number;
}

export interface LogStatistics {
  level: string;
  count: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'silly';
