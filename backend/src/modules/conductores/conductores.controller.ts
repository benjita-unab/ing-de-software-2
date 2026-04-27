import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConductoresService } from './conductores.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/conductores')
export class ConductoresController {
  constructor(private conductoresService: ConductoresService) {}

  /**
   * POST /api/conductores/upload-license
   * Sube la licencia de un conductor
   */
  @Post('upload-license')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLicense(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { expiryDate: string },
  ) {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    return await this.conductoresService.uploadDriverLicense(
      userId,
      file,
      body.expiryDate,
    );
  }

  /**
   * GET /api/conductores/:id/license-status
   * Obtiene el estado de la licencia de un conductor
   */
  @Get(':id/license-status')
  @UseGuards(JwtGuard)
  async getLicenseStatus(@Param('id') conductorId: string) {
    return await this.conductoresService.validateDriverLicense(conductorId);
  }

  /**
   * GET /api/conductores/:id
   * Obtiene información detallada de un conductor
   */
  @Get(':id')
  @UseGuards(JwtGuard)
  async getDriverInfo(@Param('id') conductorId: string) {
    return await this.conductoresService.getDriverInfo(conductorId);
  }

  /**
   * GET /api/conductores
   * Lista todos los conductores activos
   */
  @Get()
  @UseGuards(JwtGuard)
  async listActiveDrivers() {
    return await this.conductoresService.listActiveDrivers();
  }
}
