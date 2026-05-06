import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SupabaseTransport } from './supabase.transport';

/**
 * Configuración global de logger usando Winston para NestJS
 * Proporciona:
 * - Logging en consola con colores y formato personalizado
 * - Persistencia de logs en Supabase (tabla system_logs)
 * - Timestamps en ISO 8601
 * - Niveles de severidad: error, warn, info, http, debug, silly
 */

// Configurar transporte de consola
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    // Agrega colores a los niveles de log
    winston.format.colorize({ all: true }),
    // Agrega timestamp en formato ISO 8601
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Formato personalizado con información estructurada
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      // Construir la salida con contexto si está disponible
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `${timestamp} [${level}] ${contextStr} ${message}${metaStr}`;
    }),
  ),
  level: process.env.LOG_LEVEL || 'debug',
});

// Configurar transporte de Supabase
const supabaseTransport = new SupabaseTransport({
  level: process.env.LOG_LEVEL || 'debug',
});

// Crear logger con ambos transportes
export const loggerConfig = WinstonModule.createLogger({
  transports: [consoleTransport, supabaseTransport], // Solo dejamos la consola por ahora
});

// Log de estado del transporte de Supabase al iniciar
const supabaseStatus = supabaseTransport.getStatus();
console.log('📊 Supabase Logger Status:', supabaseStatus.status);
