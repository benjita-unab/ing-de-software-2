import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CalcularRutaPlantillaDto } from './dto/calcular-ruta-plantilla.dto';
import { CreateRutaPlantillaDto } from './dto/create-ruta-plantilla.dto';
import { UpdateRutaPlantillaDto } from './dto/update-ruta-plantilla.dto';
import { RutasPlantillaService } from './rutas-plantilla.service';

/**
 * HU-57 — Gestión de rutas reutilizables (plantillas).
 * Desacoplado del módulo `rutas` (ejecuciones operativas).
 */
@Controller('api/rutas-plantilla')
@UseGuards(JwtGuard, RolesGuard)
export class RutasPlantillaController {
  constructor(private readonly rutasPlantillaService: RutasPlantillaService) {}

  /** GET /api/rutas-plantilla?nombre=&activa=true|false|all */
  @Get()
  @Roles('ADMIN', 'OPERADOR')
  list(
    @Query('nombre') nombre?: string,
    @Query('q') q?: string,
    @Query('activa') activa?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.rutasPlantillaService.list(nombre || q, activa, clienteId);
  }

  /** POST /api/rutas-plantilla/calcular-ruta — distancia y tiempo vía Google Routes */
  @Post('calcular-ruta')
  @Roles('ADMIN', 'OPERADOR')
  calcularRuta(@Body() body: CalcularRutaPlantillaDto) {
    return this.rutasPlantillaService.calcularRuta(body);
  }

  /** GET /api/rutas-plantilla/:id */
  @Get(':id')
  @Roles('ADMIN', 'OPERADOR')
  getById(@Param('id') id: string) {
    return this.rutasPlantillaService.getById(id);
  }

  /** POST /api/rutas-plantilla */
  @Post()
  @Roles('ADMIN')
  create(@Body() body: CreateRutaPlantillaDto) {
    return this.rutasPlantillaService.create(body);
  }

  /** PATCH /api/rutas-plantilla/:id */
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() body: UpdateRutaPlantillaDto) {
    return this.rutasPlantillaService.update(id, body);
  }

  /** POST /api/rutas-plantilla/:id/asignar-cliente — HU-47 adjudicación en UI */
  @Post(':id/asignar-cliente')
  @Roles('ADMIN')
  asignarCliente(
    @Param('id') id: string,
    @Body() body: { clienteId: string },
  ) {
    return this.rutasPlantillaService.asignarCliente(id, body.clienteId);
  }

  /** POST /api/rutas-plantilla/:id/duplicar */
  @Post(':id/duplicar')
  @Roles('ADMIN')
  duplicar(@Param('id') id: string) {
    return this.rutasPlantillaService.duplicar(id);
  }

  /** DELETE /api/rutas-plantilla/:id — eliminación lógica (activa=false) */
  @Delete(':id')
  @Roles('ADMIN')
  desactivar(@Param('id') id: string) {
    return this.rutasPlantillaService.desactivar(id);
  }
}
