import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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

  validate(payload: any) {
    console.log('JWT VALIDATE', {
      email: payload?.email,
      sub: payload?.sub,
      role: payload?.role ?? payload?.user_role,
    });
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role || payload.user_role || 'user',
      aud: payload.aud,
      iss: payload.iss,
    };
  }
}
