import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida credenciales contra DEBUG_EMAIL / DEBUG_PASSWORD del .env
   * y emite un JWT firmado con JWT_SECRET.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const debugEmail = this.configService.get<string>('DEBUG_EMAIL');
    const debugPassword = this.configService.get<string>('DEBUG_PASSWORD');

    if (!debugEmail || !debugPassword) {
      throw new UnauthorizedException(
        'Credenciales de depuración no configuradas en el servidor',
      );
    }

    if (email !== debugEmail || password !== debugPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: email,
      email,
      role: 'mobile',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
