import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { SupabaseConfigService } from '../../config/supabase.config';
import { EmailService } from '../email/email.service';

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
  conductorId?: string;
}

const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'OPERADOR', 'CONDUCTOR', 'CLIENTE'];

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly supabaseConfig: SupabaseConfigService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Valida credenciales contra `public.usuarios` y emite JWT firmado con JWT_SECRET.
   * Usuarios CLIENTE deben tener fila en `clientes` con `usuario_id` = `usuarios.id`.
   * Usuarios CONDUCTOR deben tener fila en `conductores` con `usuario_id` = `usuarios.id` (HU-26).
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

    if (role === 'CONDUCTOR') {
      const conductorId = await this.resolveConductorIdForUsuario(
        supabase,
        usuario.id,
      );
      if (!conductorId) {
        throw new ForbiddenException(
          'Tu usuario no está vinculado a un conductor. Solicita al administrador que active tu acceso.',
        );
      }
      payload.conductorId = conductorId;
    }

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  /**
   * HU-60 CA-06: solicitud de recuperación de contraseña (portal CLIENTE).
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const normalizedEmail = email?.trim()?.toLowerCase();
    const genericMessage =
      'Si el correo está registrado en el portal cliente, recibirá instrucciones para restablecer su contraseña.';

    if (!normalizedEmail) {
      throw new BadRequestException('email es requerido');
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email, rol, activo, nombre')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!usuario || String(usuario.rol).toUpperCase() !== 'CLIENTE') {
      return { message: genericMessage };
    }

    if (usuario.activo === false) {
      return { message: genericMessage };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from('password_reset_tokens').insert([
      {
        usuario_id: usuario.id,
        token,
        expires_at: expiresAt,
      },
    ]);

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:3001';
    const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(token)}`;

    try {
      await this.emailService.enviarRecuperacionPassword(
        usuario.email,
        usuario.nombre || usuario.email,
        resetUrl,
      );
    } catch (error) {
      console.warn('HU-60 recuperación contraseña — email no enviado:', error);
    }

    return { message: genericMessage };
  }

  /**
   * HU-60 CA-06: restablece contraseña con token de un solo uso.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const tokenLimpio = token?.trim();
    const password = newPassword?.trim();

    if (!tokenLimpio) {
      throw new BadRequestException('token es requerido');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 6 caracteres',
      );
    }

    const supabase = this.supabaseConfig.getClient();
    const { data: resetRow, error } = await supabase
      .from('password_reset_tokens')
      .select('id, usuario_id, expires_at, used_at')
      .eq('token', tokenLimpio)
      .maybeSingle();

    if (error || !resetRow) {
      throw new BadRequestException('Token de recuperación inválido o expirado');
    }

    if (resetRow.used_at) {
      throw new BadRequestException('Este enlace de recuperación ya fue utilizado');
    }

    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      throw new BadRequestException('El enlace de recuperación ha expirado');
    }

    const { error: passError } = await supabase
      .from('usuarios')
      .update({ password })
      .eq('id', resetRow.usuario_id);

    if (passError) {
      throw new BadRequestException(
        `No se pudo actualizar la contraseña: ${passError.message}`,
      );
    }

    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetRow.id);

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
    };
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

  /**
   * Resuelve el conductor asociado al usuario chofer (HU-26).
   */
  private async resolveConductorIdForUsuario(
    supabase: ReturnType<SupabaseConfigService['getClient']>,
    usuarioId: string,
  ): Promise<string | null> {
    const { data: conductores, error } = await supabase
      .from('conductores')
      .select('id')
      .eq('usuario_id', usuarioId);

    const conductorIdSeleccionado = conductores?.[0]?.id ?? null;

    if (error) {
      throw new InternalServerErrorException(
        'Error al resolver el conductor asociado al usuario',
      );
    }

    return conductorIdSeleccionado;
  }
}
