import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseConfigService } from '../../config/supabase.config';

export type UserRole = 'ADMIN' | 'OPERADOR' | 'CONDUCTOR' | 'CLIENTE';

interface UsuarioAuthRow {
  id: string;
  email: string;
  password: string;
  rol: string;
  activo: boolean | null;
}

export interface JwtSignPayload {
  sub: string;
  email: string;
  role: UserRole;
  clienteId?: string;
}

const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'OPERADOR', 'CONDUCTOR', 'CLIENTE'];

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly supabaseConfig: SupabaseConfigService,
  ) {}

  /**
   * Valida credenciales contra `public.usuarios` y emite JWT firmado con JWT_SECRET.
   * Usuarios CLIENTE deben tener fila en `clientes` con `usuario_id` = `usuarios.id`.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const normalizedEmail = email?.trim()?.toLowerCase();
    const plainPassword = password ?? '';

    if (!normalizedEmail || !plainPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const supabase = this.supabaseConfig.getClient();

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, password, rol, activo')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException('Error al validar credenciales');
    }

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuario.activo === false) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    if (usuario.password !== plainPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const role = String(usuario.rol || '').toUpperCase() as UserRole;
    if (!ALLOWED_ROLES.includes(role)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtSignPayload = {
      sub: usuario.id,
      email: usuario.email,
      role,
    };

    if (role === 'CLIENTE') {
      const clienteId = await this.resolveClienteIdForUsuario(
        supabase,
        usuario.id,
      );
      if (!clienteId) {
        throw new ForbiddenException(
          'Tu usuario no está vinculado a un cliente. Solicita al administrador que active tu acceso al portal.',
        );
      }
      payload.clienteId = clienteId;
    }

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  /**
   * Resuelve el cliente B2B asociado al usuario portal (HU-27).
   */
  private async resolveClienteIdForUsuario(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    usuarioId: string,
  ): Promise<string | null> {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('id')
      .eq('usuario_id', usuarioId)
      .maybeSingle();

    if (error) {
      const message = error.message || '';
      if (/usuario_id|column/i.test(message)) {
        throw new InternalServerErrorException(
          'El portal cliente no está configurado en la base de datos. Ejecute la migración HU-27 (clientes.usuario_id).',
        );
      }
      throw new InternalServerErrorException(
        'Error al resolver el cliente asociado al usuario',
      );
    }

    return cliente?.id ?? null;
  }
}
