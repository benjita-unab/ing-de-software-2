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
import {
  RutasService,
  CreateRutaDto,
  EstimarFechasDto,
} from './rutas.service';
import { CreateAnomaliaDto } from './dto/create-anomalia.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/rutas')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class RutasController {
  constructor(private rutasService: RutasService) {}

  /**
   * POST /api/rutas
   * Crea una nueva ruta (cliente, origen/destino obligatorios; conductor/camión opcionales).
   */
  @Post()
  async createRoute(@Body() body: CreateRutaDto) {
    return await this.rutasService.createRoute(body);
  }

  /**
   * POST /api/rutas/estimar-fechas
   * HU-24: distancia vial (Google Routes) y fechas estimadas propuestas.
   */
  @Post('estimar-fechas')
  async estimarFechas(@Body() body: EstimarFechasDto) {
    return await this.rutasService.estimarFechas(body);
  }

  /**
   * POST /api/rutas/assign
   * Asigna un conductor a una ruta
   */
  @Post('assign')
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
  async getUnassignedRoutes() {
    return await this.rutasService.getUnassignedRoutes();
  }

  /**   * POST /api/rutas/:id/anomalias
   * Registra una anomalía asociada a la ruta.
   */
  @Post(':id/anomalias')
  async createAnomalia(
    @Param('id') rutaId: string,
    @Body() body: CreateAnomaliaDto,
  ) {
    return await this.rutasService.createAnomalia(rutaId, body);
  }

  /**   * GET /api/rutas/:id/anomalias
   * Obtiene las anomalías reportadas para una ruta.
   */
  @Get(':id/anomalias')
  async getAnomalias(@Param('id') rutaId: string) {
    return await this.rutasService.getAnomaliasByRuta(rutaId);
  }

  /**   * GET /api/rutas/:id/evidencias
   * Devuelve PDF de comprobante (si existe) y fotos de trazabilidad
   * de la ruta. Usado por la vista Historial.
   */
  @Get(':id/evidencias')
  async getEvidencias(@Param('id') rutaId: string) {
    return await this.rutasService.getEvidencias(rutaId);
  }

  /**
   * GET /api/rutas/:id
   * Obtiene información detallada de una ruta
   */
  @Get(':id')
  async getRouteInfo(@Param('id') rutaId: string) {
    return await this.rutasService.getRouteInfo(rutaId);
  }

  /**
   * PATCH /api/rutas/:id/status
   * Actualiza el estado de una ruta
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') rutaId: string,
    @Body() body: { estado: string },
  ) {
    return await this.rutasService.updateRouteStatus(rutaId, body.estado);
  }

  /**
   * PATCH /api/rutas/:id/tiempos
   * Actualiza los tiempos de inspección de una ruta y calcula el tiempo de espera si ambos están presentes
   */
  @Patch(':id/tiempos')
  async updateTiemposInspeccion(
    @Param('id') rutaId: string,
    @Body() body: {
      hora_llegada_destino?: string;
      hora_inspeccion_aprobada?: string;
    },
  ) {
    return await this.rutasService.updateTiemposInspeccion(rutaId, body);
  }

  /**
   * PATCH /api/rutas/:id/fechas-estimadas
   * HU-9: guarda rango y día estimado de entrega.
   */
  @Patch(':id/fechas-estimadas')
  async updateFechasEstimadas(
    @Param('id') rutaId: string,
    @Body()
    body: {
      fecha_estimada_inicio: string;
      fecha_estimada_fin: string;
      fecha_estimada_entrega: string;
      distancia_km?: number | string | null;
    },
  ) {
    return await this.rutasService.updateFechasEstimadas(rutaId, body);
  }

  /**
   * POST /api/rutas/:id/notificar-fecha-estimada
   * HU-9: envía correo al cliente con fechas estimadas de entrega.
   */
  @Post(':id/notificar-fecha-estimada')
  async notificarFechaEstimada(@Param('id') rutaId: string) {
    return await this.rutasService.notificarFechaEstimada(rutaId);
  }

  /**
   * GET /api/rutas
   * Lista rutas con filtros opcionales
   */
  @Get()
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
