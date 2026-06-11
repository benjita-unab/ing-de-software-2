import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChatRutaService } from './chat-ruta.service';
import { CreateChatMensajeDto } from './dto/create-chat-mensaje.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';

@Controller('api/chat')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class ChatRutaController {
  constructor(private readonly chatRutaService: ChatRutaService) {}

  @Get('conversaciones')
  listConversaciones(@CurrentUser() user: AuthenticatedUser) {
    return this.chatRutaService.listConversaciones(user);
  }

  @Get('rutas/:rutaId/mensajes')
  listMensajes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('rutaId') rutaId: string,
  ) {
    return this.chatRutaService.listMensajes(user, rutaId);
  }

  @Post('rutas/:rutaId/mensajes')
  createMensaje(
    @CurrentUser() user: AuthenticatedUser,
    @Param('rutaId') rutaId: string,
    @Body() body: CreateChatMensajeDto,
  ) {
    return this.chatRutaService.createMensaje(user, rutaId, body);
  }

  @Patch('rutas/:rutaId/leido')
  marcarLeidos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('rutaId') rutaId: string,
  ) {
    return this.chatRutaService.marcarLeidos(user, rutaId);
  }
}
