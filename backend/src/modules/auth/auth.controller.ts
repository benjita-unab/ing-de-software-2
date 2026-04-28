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

    return this.authService.login(body.email, body.password);
  }
}
