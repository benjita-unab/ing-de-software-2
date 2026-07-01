import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Param,
} from '@nestjs/common';
import { EntregasService } from './entregas.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/entregas')
@UseGuards(JwtGuard, RolesGuard, LicenseGuard)
export class EntregasController {
  constructor(private entregasService: EntregasService) {}

  /**
   * POST /api/entregas/:rutaId/close
   * Cierra una entrega (genera PDF, envía email, marca como validada)
   */
  @Post(':rutaId/close')
  @Roles('CONDUCTOR')
  async closeDelivery(
    @Param('rutaId') rutaId: string,
    @CurrentUser('email') userEmail: string,
    @Body()
    body?: {
      clienteEmail?: string;
      bultos_recepcionados?: number;
      comentario_diferencia_bultos?: string;
    },
  ) {
    // TEMP LOG
    console.log('CLOSE DELIVERY -> rutaId:', rutaId, 'body:', body);
    return await this.entregasService.closeDelivery(
      rutaId,
      body?.clienteEmail || userEmail,
      body?.bultos_recepcionados,
      body?.comentario_diferencia_bultos,
    );
  }

  /**
   * POST /api/entregas/:rutaId/signature
   * Guarda la firma de recepción (base64)
   */
  @Post(':rutaId/signature')
  @Roles('CONDUCTOR')
  async saveSignature(
    @Param('rutaId') rutaId: string,
    @Body() body: { base64Signature: string },
  ) {
    // TEMP LOG
    console.log(
      'SAVE SIGNATURE -> rutaId:',
      rutaId,
      'base64Signature length:',
      body?.base64Signature?.length ?? 0,
    );
    return await this.entregasService.saveSignature(
      rutaId,
      body.base64Signature,
    );
  }

  /**
   * POST /api/entregas/:rutaId/photo
   * Guarda la foto de la ficha de despacho (base64)
   */
  @Post(':rutaId/photo')
  @Roles('CONDUCTOR')
  async savePhoto(
    @Param('rutaId') rutaId: string,
    @Body() body: { base64Photo: string },
  ) {
    return await this.entregasService.savePhoto(rutaId, body.base64Photo);
  }

  /**
   * GET /api/entregas/:rutaId
   * Obtiene el estado de una entrega
   */
  @Get(':rutaId')
  @Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
  async getDeliveryStatus(@Param('rutaId') rutaId: string) {
    return await this.entregasService.getDeliveryStatus(rutaId);
  }
}
