import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConductoresService } from './conductores.service';
import {
  PagoConductoresService,
  PeriodoPago,
} from './pago-conductores.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/conductores')
export class ConductoresController {
  constructor(
    private conductoresService: ConductoresService,
    private pagoConductoresService: PagoConductoresService,
  ) {}

  /**
   * POST /api/conductores/upload-license
   * Sube la licencia de un conductor
   */
  @Post('upload-license')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadLicense(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { expiryDate: string; conductorId?: string },
  ) {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    if (!body?.expiryDate) {
      throw new BadRequestException('expiryDate es requerido');
    }

    return await this.conductoresService.uploadDriverLicense(
      userId,
      file,
      body.expiryDate,
      body.conductorId,
    );
  }

  /**
   * POST /api/conductores/asignar-camion
   * Asigna un camión a un conductor (1 a 1)
   */
  @Post('asignar-camion')
  @UseGuards(JwtGuard)
  async asignarCamion(
    @Body() body: { conductorId: string; camionId: string },
  ) {
    return await this.conductoresService.asignarCamion(
      body.conductorId,
      body.camionId,
    );
  }

  /**
   * POST /api/conductores/liberar-camion
   * Libera el camión de un conductor
   */
  @Post('liberar-camion')
  @UseGuards(JwtGuard)
  async liberarCamion(@Body() body: { conductorId: string }) {
    return await this.conductoresService.liberarCamion(body.conductorId);
  }

  /**
   * GET /api/conductores/metricas-pago/comparativa
   * HU-37 CA-08: comparativa de rendimiento entre conductores activos.
   */
  @Get('metricas-pago/comparativa')
  @UseGuards(JwtGuard)
  async getComparativaMetricasPago(
    @Query('periodo') periodo?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return await this.pagoConductoresService.getComparativaMetricas(
      this.parsePeriodoPago(periodo),
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * GET /api/conductores/:id/metricas-pago
   * HU-37: métricas operacionales y cálculo de pago por período.
   */
  @Get(':id/metricas-pago')
  @UseGuards(JwtGuard)
  async getMetricasPagoConductor(
    @Param('id') conductorId: string,
    @Query('periodo') periodo?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return await this.pagoConductoresService.getMetricasPagoConductor(
      conductorId,
      this.parsePeriodoPago(periodo),
      fechaInicio,
      fechaFin,
    );
  }

  /**
   * GET /api/conductores/mi-flota/asignacion
   * Endpoint optimizado para la App Móvil
   */
  @Get('mi-flota/asignacion')
  @UseGuards(JwtGuard)
  async getMiFlotaAsignacion(@CurrentUser('id') userId: string) {
    return await this.conductoresService.getMiFlotaAsignacion(userId);
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
  async listActiveDrivers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('orden') orden?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return await this.conductoresService.listActiveDrivers({
      page: pageNum,
      limit: limitNum,
      search,
      orden,
    });
  }


  /**
   * POST /api/conductores/:id/licencias/:licenseId/approve
   * Aprobar o rechazar la licencia de un conductor
   */
  @Post(':id/licencias/:licenseId/status')
  @UseGuards(JwtGuard)
  async updateLicenseStatus(
    @Param('id') conductorId: string,
    @Param('licenseId') licenseId: string,
    @Body('status') status: 'approved' | 'rejected',
  ) {
    if (!['approved', 'rejected'].includes(status)) {
      throw new BadRequestException('Estado inválido');
    }
    return await this.conductoresService.updateLicenseStatus(conductorId, licenseId, status);
  }

  /**
   * POST /api/conductores
   * Crea un nuevo conductor (y su usuario de auth)
   */
  @Post()
  @UseGuards(JwtGuard)
  async createConductor(@Body() body: any) {
    return await this.conductoresService.createConductor(body);
  }

  private parsePeriodoPago(periodo?: string): PeriodoPago {
    const value = (periodo || 'mensual').trim().toLowerCase();
    if (['diario', 'semanal', 'mensual', 'rango'].includes(value)) {
      return value as PeriodoPago;
    }
    throw new BadRequestException(
      'periodo inválido. Valores: diario, semanal, mensual, rango',
    );
  }
}
