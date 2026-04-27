import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_PUBLIC_KEY,
      algorithms: ['HS256'],
    });
  }

  validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.user_role || 'user',
      aud: payload.aud,
      iss: payload.iss,
    };
  }
}
