import { Request, Response, NextFunction } from 'express';

/**
 * Forma estándar de todas las respuestas de error de la API.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  details?: unknown;
}

/**
 * Clase utilitaria para lanzar errores HTTP tipados desde cualquier capa.
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Middleware de manejo de errores centralizado.
 * Express lo reconoce por tener 4 parámetros (err, req, res, next).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Error no controlado — loguear y devolver 500 genérico
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: { message: 'Internal server error' },
  });
}
