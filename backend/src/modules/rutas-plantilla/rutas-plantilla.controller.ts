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
@Roles('ADMIN', 'OPERADOR')
export class RutasPlantillaController {
  constructor(private readonly rutasPlantillaService: RutasPlantillaService) {}

  /** GET /api/rutas-plantilla?nombre=&activa=true|false|all */
  @Get()
  list(
    @Query('nombre') nombre?: string,
    @Query('q') q?: string,
    @Query('activa') activa?: string,
  ) {
    return this.rutasPlantillaService.list(nombre || q, activa);
  }

  /** POST /api/rutas-plantilla/calcular-ruta — distancia y tiempo vía Google Routes */
  @Post('calcular-ruta')
  calcularRuta(@Body() body: CalcularRutaPlantillaDto) {
    return this.rutasPlantillaService.calcularRuta(body);
  }

  /** GET /api/rutas-plantilla/:id */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.rutasPlantillaService.getById(id);
  }

  /** POST /api/rutas-plantilla */
  @Post()
  create(@Body() body: CreateRutaPlantillaDto) {
    return this.rutasPlantillaService.create(body);
  }

  /** PATCH /api/rutas-plantilla/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateRutaPlantillaDto) {
    return this.rutasPlantillaService.update(id, body);
  }

  /** POST /api/rutas-plantilla/:id/duplicar */
  @Post(':id/duplicar')
  duplicar(@Param('id') id: string) {
    return this.rutasPlantillaService.duplicar(id);
  }

  /** DELETE /api/rutas-plantilla/:id — eliminación lógica (activa=false) */
  @Delete(':id')
  desactivar(@Param('id') id: string) {
    return this.rutasPlantillaService.desactivar(id);
  }
}
