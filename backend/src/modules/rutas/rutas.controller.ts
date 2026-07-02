import {
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  Body,
  Param,
  Query,
  ForbiddenException,
  Req,
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
import { LicenseGuard } from '../../common/guards/license.guard';
import type { AuthenticatedUser } from '../../common/strategies/jwt.strategy';

@Controller('api/rutas')
@UseGuards(JwtGuard, RolesGuard, LicenseGuard)
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
   * POST /api/rutas/:id/assign
   * Asigna un conductor a una ruta
   */
  @Post(':id/assign')
  @Roles('ADMIN', 'OPERADOR')
  async assignDriver(
    @Param('id') rutaId: string,
    @Body()
    body: {
      conductorId: string;
      camionId: string;
      slotsRequeridos?: number;
    },
    @Req() req: any,
  ) {
    return await this.rutasService.assignDriverToRoute(
      rutaId,
      body.conductorId,
      body.camionId,
      req.user.id,
      body.slotsRequeridos,
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
   * GET /api/rutas/:id/consolidacion
   * HU-59: estado de consolidación, capacidad, advertencias y paradas para mapa.
   */
  @Get(':id/consolidacion')
  async getConsolidacion(@Param('id') rutaId: string) {
    return await this.rutasService.getConsolidacionInfo(rutaId);
  }

  /**
   * POST /api/rutas/:id/consolidar
   * HU-59: asigna un pedido a la ruta maestra indicada.
   */
  @Post(':id/consolidar')
  @Roles('ADMIN', 'OPERADOR')
  async consolidarPedido(
    @Param('id') rutaId: string,
    @Body()
    body: {
      pedido_id: string;
      ignorar_advertencias_ocupacion?: boolean;
      ignorar_advertencias_distancia?: boolean;
    },
  ) {
    return await this.rutasService.consolidarPedido(rutaId, body);
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
   * GET /api/rutas/:id/tracking
   * HU-44 Fase 1: obtiene ubicación actual e historial GPS de la ruta.
   */
  @Get(':id/tracking')
  @Roles('ADMIN', 'OPERADOR')
  async getRouteTracking(@Param('id') rutaId: string) {
    return await this.rutasService.getRouteTracking(rutaId);
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
   * POST /api/rutas/:id/llegada
   * Registra la llegada a destino y comienza el temporizador
   */
  @Post(':id/llegada')
  async registrarLlegada(@Param('id') rutaId: string) {
    return await this.rutasService.registrarLlegadaDestino(rutaId);
  }

  /**
   * POST /api/rutas/:id/scan-qr
   * Escanea el QR, detiene el temporizador, calcula cobro extra y cambia estado.
   */
  @Post(':id/scan-qr')
  async scanQrDestino(@Param('id') rutaId: string) {
    return await this.rutasService.scanQrDestino(rutaId);
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
   * POST /api/rutas/:id/reset
   * Modo Prueba: Resetea el estado y horas de la ruta para volver a probar el flujo completo.
   */
  @Post(':id/reset')
  async resetRouteForTesting(@Param('id') rutaId: string) {
    return await this.rutasService.resetRouteForTesting(rutaId);
  }

  /**
   * GET /api/rutas
   * Lista rutas con filtros opcionales y paginación.
   * HU-26: CONDUCTOR solo ve rutas con su conductorId (JWT), ignora query conductorId.
   */
  @Get()
  async listRoutes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('conductorId') conductorId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('generadoAutomaticamente') generadoAutomaticamente?: string,
  ) {
    let effectiveConductorId = conductorId;

    if (user?.role === 'CONDUCTOR') {
      const scoped = user.conductorId?.trim();
      if (!scoped) {
        throw new ForbiddenException(
          'Sesión de conductor sin vínculo. Vuelve a iniciar sesión.',
        );
      }
      effectiveConductorId = scoped;
    }

    const filters = {
      estado,
      conductorId: effectiveConductorId,
      clienteId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      generadoAutomaticamente:
        generadoAutomaticamente === 'true'
          ? true
          : generadoAutomaticamente === 'false'
            ? false
            : undefined,
    };

    return await this.rutasService.listRoutes(filters);
  }
}
