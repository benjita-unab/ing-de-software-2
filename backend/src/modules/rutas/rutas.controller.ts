import {
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RutasService, CreateRutaDto } from './rutas.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/rutas')
export class RutasController {
  constructor(private rutasService: RutasService) {}

  /**
   * POST /api/rutas
   * Crea una nueva ruta (cliente, origen/destino obligatorios; conductor/camión opcionales).
   */
  @Post()
  @UseGuards(JwtGuard)
  async createRoute(@Body() body: CreateRutaDto) {
    return await this.rutasService.createRoute(body);
  }

  /**
   * POST /api/rutas/assign
   * Asigna un conductor a una ruta
   */
  @Post('assign')
  @UseGuards(JwtGuard)
  async assignDriver(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      rutaId: string;
      conductorId: string;
      camionId: string;
      cargaRequeridaKg?: number;
    },
  ) {
    return await this.rutasService.assignDriverToRoute(
      body.rutaId,
      body.conductorId,
      body.camionId,
      userId,
      body.cargaRequeridaKg,
    );
  }

  /**
   * GET /api/rutas/unassigned
   * Obtiene rutas sin asignar
   */
  @Get('unassigned')
  @UseGuards(JwtGuard)
  async getUnassignedRoutes() {
    return await this.rutasService.getUnassignedRoutes();
  }

  /**
   * GET /api/rutas/:id/evidencias
   * Devuelve PDF de comprobante (si existe) y fotos de trazabilidad
   * de la ruta. Usado por la vista Historial.
   */
  @Get(':id/evidencias')
  @UseGuards(JwtGuard)
  async getEvidencias(@Param('id') rutaId: string) {
    return await this.rutasService.getEvidencias(rutaId);
  }

  /**
   * GET /api/rutas/:id
   * Obtiene información detallada de una ruta
   */
  @Get(':id')
  @UseGuards(JwtGuard)
  async getRouteInfo(@Param('id') rutaId: string) {
    return await this.rutasService.getRouteInfo(rutaId);
  }

  /**
   * PATCH /api/rutas/:id/status
   * Actualiza el estado de una ruta
   */
  @Patch(':id/status')
  @UseGuards(JwtGuard)
  async updateStatus(
    @Param('id') rutaId: string,
    @Body() body: { estado: string },
  ) {
    return await this.rutasService.updateRouteStatus(rutaId, body.estado);
  }

  /**
   * GET /api/rutas
   * Lista rutas con filtros opcionales
   */
  @Get()
  @UseGuards(JwtGuard)
  async listRoutes(
    @Query('estado') estado?: string,
    @Query('conductorId') conductorId?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return await this.rutasService.listRoutes({
      estado,
      conductorId,
      clienteId,
    });
  }
}
