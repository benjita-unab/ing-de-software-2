import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from './errorHandler';

/**
 * Payload que esperas dentro del JWT emitido por Supabase o tu propio auth server.
 * Ajusta los campos según lo que Supabase incluye en sus tokens.
 */
export interface JwtPayload {
  sub: string;        // user id (UUID de Supabase)
  email?: string;
  role?: string;
  iat: number;
  exp: number;
}

// Extendemos el tipo de Request para que los controladores puedan leer req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autenticación JWT.
 *
 * Espera el header:  Authorization: Bearer <token>
 * Si el token es válido, adjunta el payload en req.user y llama a next().
 * Si no, lanza 401.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return next(
      new HttpError(401, 'Authorization header missing or malformed')
    );
  }

  const token = authHeader.slice(7); // remueve "Bearer "

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new HttpError(401, 'Token expired'));
    }
    return next(new HttpError(401, 'Invalid token'));
  }
}
