import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface LoginDto {
  email: string;
  password: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Respuesta: { accessToken }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email y password son requeridos');
    }

    return this.authService.login(
      body.email.trim(),
      body.password,
    );
  }

  /**
   * POST /api/auth/forgot-password
   * HU-60 CA-06: solicita enlace de recuperación (portal cliente).
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    if (!body?.email?.trim()) {
      throw new BadRequestException('email es requerido');
    }
    return this.authService.requestPasswordReset(body.email.trim());
  }

  /**
   * POST /api/auth/reset-password
   * HU-60 CA-06: restablece contraseña con token.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ) {
    if (!body?.token?.trim()) {
      throw new BadRequestException('token es requerido');
    }
    if (!body?.newPassword) {
      throw new BadRequestException('newPassword es requerido');
    }
    return this.authService.resetPassword(body.token.trim(), body.newPassword);
  }
}
