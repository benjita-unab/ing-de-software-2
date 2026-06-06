import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida credenciales contra la tabla `usuarios` de Supabase.
   * Como respaldo usa DEBUG_EMAIL/DEBUG_PASSWORD del .env.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    let isValid = false;
    let authPayload = null;

    // 1. Buscar usuario en la tabla `usuarios` de Supabase usando Service Role Key
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: users, error } = await supabase
        .from('usuarios')
        .select('id, email, password, nombre')
        .eq('email', email)
        .limit(1);

      if (!error && users && users.length > 0) {
        const user = users[0];
        if (user.password === password) {
          isValid = true;
          authPayload = {
            sub: user.id,
            email: user.email,
            nombre: user.nombre,
            role: 'operador',
          };
        }
      }

      if (error) {
        console.error('Supabase query error:', error.message);
      }
    }

    // 2. Respaldo: credenciales de depuración del .env
    if (!isValid) {
      const debugEmail = this.configService.get<string>('DEBUG_EMAIL');
      const debugPassword = this.configService.get<string>('DEBUG_PASSWORD');

      if (debugEmail && debugPassword && email === debugEmail && password === debugPassword) {
        isValid = true;
        authPayload = {
          sub: email,
          email,
          role: 'debug',
        };
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = await this.jwtService.signAsync(authPayload);

    return { accessToken };
  }
}
