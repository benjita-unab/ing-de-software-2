/**
 * logger.ts
 * Logger centralizado con prefijos y niveles.
 * - En development: muestra DEBUG
 * - En production:  omite DEBUG, mantiene INFO / WARN / ERROR
 */

const isDev = process.env.NODE_ENV !== 'production';

function fmt(level: string, prefix: string, msg: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] [${prefix}] ${msg}`;
}

export const logger = {
  info(prefix: string, msg: string, meta?: unknown): void {
    console.log(fmt('INFO ', prefix, msg), meta !== undefined ? meta : '');
  },

  warn(prefix: string, msg: string, meta?: unknown): void {
    console.warn(fmt('WARN ', prefix, msg), meta !== undefined ? meta : '');
  },

  error(prefix: string, msg: string, meta?: unknown): void {
    console.error(fmt('ERROR', prefix, msg), meta !== undefined ? meta : '');
  },

  debug(prefix: string, msg: string, meta?: unknown): void {
    if (isDev) {
      console.log(fmt('DEBUG', prefix, msg), meta !== undefined ? meta : '');
    }
  },
};
