/**
 * response.ts
 * Contract estándar de respuesta para TODOS los endpoints del BFF.
 *
 * Shape:
 *   { success: boolean, data?: T, error?: string, warning?: string }
 *
 * El syncEngine y el frontend dependen de este contrato. NO cambiar la forma.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

/** Respuesta exitosa, con data opcional y warning opcional. */
export function ok<T>(data?: T, warning?: string): ApiResponse<T> {
  return {
    success: true,
    ...(data !== undefined ? { data } : {}),
    ...(warning ? { warning } : {}),
  };
}

/** Respuesta de error. */
export function fail(error: string): ApiResponse {
  return { success: false, error };
}
