import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ParadasService } from './paradas.service';
import type { CreateParadaDto } from './dto/create-parada.dto';
import type { ReorderParadasDto } from './dto/reorder-paradas.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * HU-61 — Controlador de Paradas Intermedias.
 *
 * Base path: /api/rutas/:rutaId/paradas
 *
 * Endpoints:
 *   GET    /api/rutas/:rutaId/paradas            — listar paradas
 *   POST   /api/rutas/:rutaId/paradas            — crear parada
 *   PATCH  /api/rutas/:rutaId/paradas/reorder    — reordenar (Task #521)
 *   PATCH  /api/rutas/:rutaId/paradas/recalcular — recalcular distancia (Task #523)
 *   PATCH  /api/rutas/:rutaId/paradas/:paradaId  — editar parada
 *   DELETE /api/rutas/:rutaId/paradas/:paradaId  — eliminar parada
 *
 * NOTA: Se aloja bajo /api/rutas/:rutaId/paradas para mantener
 * coherencia REST con la entidad existente rutas, sin crear
 * una ruta raíz nueva que pueda colisionar.
 */
@Controller('api/rutas/:rutaId/paradas')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'OPERADOR', 'CONDUCTOR')
export class ParadasController {
  constructor(private paradasService: ParadasService) {}

  /**
   * GET /api/rutas/:rutaId/paradas
   * Lista todas las paradas de la ruta ordenadas por campo `orden`.
   */
  @Get()
  async getParadas(@Param('rutaId') rutaId: string) {
    return this.paradasService.getParadasByRuta(rutaId);
  }

  /**
   * POST /api/rutas/:rutaId/paradas
   * Crea una nueva parada. Dispara recálculo de distancia automáticamente.
   */
  @Post()
  async createParada(
    @Param('rutaId') rutaId: string,
    @Body() body: CreateParadaDto,
  ) {
    return this.paradasService.createParada(rutaId, body);
  }

  /**
   * PATCH /api/rutas/:rutaId/paradas/reorder
   * Recibe el nuevo orden completo de las paradas y lo persiste (Task #521).
   * Body: { paradas: [ { id, orden }, ... ] }
   */
  @Patch('reorder')
  async reorderParadas(
    @Param('rutaId') rutaId: string,
    @Body() body: ReorderParadasDto,
  ) {
    return this.paradasService.reorderParadas(rutaId, body);
  }

  /**
   * PATCH /api/rutas/:rutaId/paradas/recalcular
   * Fuerza el recálculo de distancia total y ETA (Task #523).
   * Útil para disparar el cálculo manualmente desde la UI.
   */
  @Patch('recalcular')
  async recalcularDistancia(@Param('rutaId') rutaId: string) {
    return this.paradasService.recalcularDistanciaRuta(rutaId);
  }

  /**
   * PATCH /api/rutas/:rutaId/paradas/:paradaId
   * Edita dirección, lat/lng o tipo de una parada existente.
   */
  @Patch(':paradaId')
  async updateParada(
    @Param('rutaId') rutaId: string,
    @Param('paradaId') paradaId: string,
    @Body() body: Partial<CreateParadaDto>,
  ) {
    return this.paradasService.updateParada(rutaId, paradaId, body);
  }

  /**
   * DELETE /api/rutas/:rutaId/paradas/:paradaId
   * Elimina una parada y renumera las restantes. Recalcula distancia.
   */
  @Delete(':paradaId')
  async deleteParada(
    @Param('rutaId') rutaId: string,
    @Param('paradaId') paradaId: string,
  ) {
    return this.paradasService.deleteParada(rutaId, paradaId);
  }
}
