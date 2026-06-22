import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { CreateCamionDto } from './dto/create-camion.dto';
import { UpdateCamionDto } from './dto/update-camion.dto';
import { RegistrarRevisionDto } from './dto/registrar-revision.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/camiones')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class CamionesController {
  constructor(private camionesService: CamionesService) {}

  /**
   * GET /api/camiones
   * Lista todos los camiones activos (con su estado real).
   */
  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
    @Query('orden') orden?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return await this.camionesService.listCamiones({
      page: pageNum,
      limit: limitNum,
      search,
      estado,
      orden,
    });
  }

  /**
   * GET /api/camiones/disponibles
   * Lista solo camiones DISPONIBLES (útil para asignación de rutas).
   */
  @Get('disponibles')
  async listDisponibles() {
    return await this.camionesService.listCamionesDisponibles();
  }

  /**
   * GET /api/camiones/:id
   * Detalle de un camión activo.
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return await this.camionesService.getCamion(id);
  }

  /**
   * POST /api/camiones
   * Crea un nuevo camión (HU-39).
   */
  @Post()
  @Roles('ADMIN', 'OPERADOR')
  async create(@Body() body: CreateCamionDto) {
    return await this.camionesService.createCamion(body);
  }

  /**
   * PATCH /api/camiones/:id/revision-tecnica
   * Registra revisión técnica: ultima_mantencion=hoy, proxima_mantencion=configurada.
   */
  @Patch(':id/revision-tecnica')
  @Roles('ADMIN', 'OPERADOR')
  async registrarRevision(
    @Param('id') id: string,
    @Body() body: RegistrarRevisionDto,
  ) {
    return await this.camionesService.registrarRevisionTecnica(
      id,
      body.proxima_mantencion,
    );
  }

  /**
   * PATCH /api/camiones/:id
   * Actualiza datos operativos del camión (HU-39).
   */
  @Patch(':id')
  @Roles('ADMIN', 'OPERADOR')
  async update(@Param('id') id: string, @Body() body: UpdateCamionDto) {
    return await this.camionesService.updateCamion(id, body);
  }
}
