import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntregasService } from './entregas.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/entregas')
export class EntregasController {
  constructor(private entregasService: EntregasService) {}

  /**
   * POST /api/entregas/:rutaId/close
   * Cierra una entrega (genera PDF, envía email, marca como validada)
   */
  @Post(':rutaId/close')
  @UseGuards(JwtGuard)
  async closeDelivery(
    @Param('rutaId') rutaId: string,
    @CurrentUser('email') userEmail: string,
    @Body() body?: { clienteEmail?: string },
  ) {
    // TEMP LOG
    console.log('CLOSE DELIVERY -> rutaId:', rutaId, 'body:', body);
    return await this.entregasService.closeDelivery(
      rutaId,
      body?.clienteEmail || userEmail,
    );
  }

  /**
   * POST /api/entregas/:rutaId/signature
   * Guarda la firma de recepción (base64)
   */
  @Post(':rutaId/signature')
  @UseGuards(JwtGuard)
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
  @UseGuards(JwtGuard)
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
  @UseGuards(JwtGuard)
  async getDeliveryStatus(@Param('rutaId') rutaId: string) {
    return await this.entregasService.getDeliveryStatus(rutaId);
  }
}
