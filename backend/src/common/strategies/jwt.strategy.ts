import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../modules/auth/auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  user_role?: string;
  clienteId?: string;
  conductorId?: string;
  aud?: string;
  iss?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole | 'user';
  clienteId?: string;
  conductorId?: string;
  aud?: string;
  iss?: string;
}

const ALLOWED_ROLES: UserRole[] = [
  'ADMIN',
  'OPERADOR',
  'CONDUCTOR',
  'CLIENTE',
];

function normalizeRole(raw?: string): UserRole | 'user' {
  const role = String(raw || '').toUpperCase();
  if (ALLOWED_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  if (role === 'MOBILE' || role === 'OPERATOR') {
    return 'OPERADOR';
  }
  return 'user';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const role = normalizeRole(payload.role ?? payload.user_role);

    return {
      id: payload.sub,
      email: payload.email,
      role,
      clienteId:
        typeof payload.clienteId === 'string' && payload.clienteId.trim()
          ? payload.clienteId.trim()
          : undefined,
      conductorId:
        typeof payload.conductorId === 'string' && payload.conductorId.trim()
          ? payload.conductorId.trim()
          : undefined,
      aud: payload.aud,
      iss: payload.iss,
    };
  }
}
