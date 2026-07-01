import {
  Controller,
  Post,
  Get,
  Put,
  Query,
  UseGuards,
  Body,
  Param,
} from '@nestjs/common';
import {
  ClientesService,
  CreateClienteDto,
} from './clientes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/clientes')
@UseGuards(JwtGuard, RolesGuard)
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  /**
   * POST /api/clientes
   * Crea un nuevo cliente.
   */
  @Post()
  @Roles('ADMIN')
  async createCliente(@Body() body: CreateClienteDto) {
    return await this.clientesService.createCliente(body);
  }

  /**
   * GET /api/clientes
   * Lista todos los clientes, opcionalmente filtrados por búsqueda.
   */
  @Get()
  @Roles('ADMIN', 'OPERADOR')
  async listClientes(@Query('q') query?: string) {
    return await this.clientesService.listClientes(query);
  }

  /**
   * GET /api/clientes/:id/rutas-plantilla
   * HU-60: plantillas adjudicadas al cliente.
   */
  @Get(':id/rutas-plantilla')
  @Roles('ADMIN', 'OPERADOR')
  async getRutasPlantillaPorCliente(@Param('id') id: string) {
    return await this.clientesService.getRutasPlantillaPorCliente(id);
  }

  /**
   * GET /api/clientes/:id/despachos
   * Obtiene el historial de despachos de un cliente.
   */
  @Get(':id/despachos')
  @Roles('ADMIN', 'OPERADOR')
  async getHistorialDespachos(@Param('id') id: string) {
    return await this.clientesService.getHistorialDespachos(id);
  }

  /**
   * GET /api/clientes/:id
   * Obtiene el detalle de un cliente.
   */
  @Get(':id')
  @Roles('ADMIN', 'OPERADOR')
  async getCliente(@Param('id') id: string) {
    return await this.clientesService.getCliente(id);
  }

  /**
   * PUT /api/clientes/:id
   * Edita un cliente existente.
   */
  @Put(':id')
  @Roles('ADMIN', 'OPERADOR')
  async updateCliente(@Param('id') id: string, @Body() body: CreateClienteDto) {
    return await this.clientesService.updateCliente(id, body);
  }
}
