import * as winston from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Transporte personalizado de Winston que persiste los logs en Supabase
 * Implementa la interfaz de winston-transport para integración seamless
 *
 * Características:
 * - Inserta logs en tabla system_logs de Supabase
 * - Maneja errores de forma silenciosa sin bloquear la aplicación
 * - Soporta todos los niveles de log de Winston
 * - Incluye metadata y contexto en cada registro
 * - Inicializa cliente de Supabase desde variables de entorno
 */
export class SupabaseTransport extends Transport {
  private supabaseClient: SupabaseClient | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(opts?: TransportStreamOptions) {
    super(opts);
    this.initializeClient();
  }

  /**
   * Inicializa el cliente de Supabase de forma asincrónica y lazy
   */
  private initializeClient(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLIC_KEY;

    // Si no tenemos las variables de entorno, loguear una advertencia y salir
    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        '⚠️  Variables de entorno SUPABASE_URL o SUPABASE_PUBLIC_KEY no están definidas. ' +
        'El transporte de Supabase estará deshabilitado.',
      );
      this.isInitialized = false;
      return;
    }

    try {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.isInitialized = true;
    } catch (error) {
      console.error(
        '❌ Error inicializando cliente de Supabase para logs:',
        error instanceof Error ? error.message : String(error),
      );
      this.isInitialized = false;
    }
  }

  /**
   * Implementa el método log de winston-transport
   * Inserta registros en la tabla system_logs de Supabase
   *
   * @param info - Objeto con información del log (level, message, timestamp, metadata)
   * @param callback - Callback que se ejecuta después de procesar el log
   */
  async log(
    info: any,
    callback?: () => void,
  ): Promise<void> {
    // Llamar al callback inmediatamente para no bloquear winston
    if (callback) {
      setImmediate(() => callback());
    }

    // Si Supabase no está inicializado, salir silenciosamente
    if (!this.isInitialized || !this.supabaseClient) {
      return;
    }

    try {
      // Extraer componentes del log
      const {
        level,
        message,
        timestamp: logTimestamp,
        context,
        ...rest
      } = info;

      // Preparar datos para insertar en Supabase
      const logRecord = {
        level: level || 'info',
        message: message || '',
        context: context || 'Unknown',
        timestamp: logTimestamp || new Date().toISOString(),
        // Guardar el resto como metadata (stack traces, IDs, etc.)
        metadata: Object.keys(rest).length > 0 ? rest : null,
      };

      // Insertar en Supabase
      const { error } = await this.supabaseClient
        .from('system_logs')
        .insert([logRecord]);

      if (error) {
        // Log a stderr sin usar winston para evitar recursión infinita
        console.error(
          `❌ Error insertando log en Supabase [${logRecord.level}]:`,
          error.message,
        );
      }
    } catch (error) {
      // Capturar cualquier error inesperado y loguear en stderr
      console.error(
        '❌ Error inesperado en SupabaseTransport:',
        error instanceof Error ? error.message : String(error),
      );
      // No relanzar el error para que no bloquee la aplicación
    }
  }

  /**
   * Método para verificar si el transporte está listo
   */
  isReady(): boolean {
    return this.isInitialized && this.supabaseClient !== null;
  }

  /**
   * Método para obtener información de diagnóstico del transporte
   */
  getStatus(): {
    initialized: boolean;
    hasClient: boolean;
    status: string;
  } {
    return {
      initialized: this.isInitialized,
      hasClient: this.supabaseClient !== null,
      status: this.isInitialized
        ? 'Supabase Transport Ready'
        : 'Supabase Transport Disabled (Missing environment variables)',
    };
  }
}