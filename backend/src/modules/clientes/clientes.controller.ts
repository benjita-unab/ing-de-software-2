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
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('api/clientes')
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  /**
   * POST /api/clientes
   * Crea un nuevo cliente.
   */
  @Post()
  @UseGuards(JwtGuard)
  async createCliente(@Body() body: CreateClienteDto) {
    return await this.clientesService.createCliente(body);
  }

  /**
   * GET /api/clientes
   * Lista todos los clientes, opcionalmente filtrados por búsqueda.
   */
  @Get()
  @UseGuards(JwtGuard)
  async listClientes(@Query('q') query?: string) {
    return await this.clientesService.listClientes(query);
  }

  /**
   * GET /api/clientes/:id
   * Obtiene el detalle de un cliente.
   */
  @Get(':id')
  @UseGuards(JwtGuard)
  async getCliente(@Param('id') id: string) {
    return await this.clientesService.getCliente(id);
  }

  /**
   * PUT /api/clientes/:id
   * Edita un cliente existente.
   */
  @Put(':id')
  @UseGuards(JwtGuard)
  async updateCliente(@Param('id') id: string, @Body() body: CreateClienteDto) {
    return await this.clientesService.updateCliente(id, body);
  }

  /**
   * GET /api/clientes/:id/despachos
   * Obtiene el historial de despachos de un cliente.
   */
  @Get(':id/despachos')
  @UseGuards(JwtGuard)
  async getHistorialDespachos(@Param('id') id: string) {
    return await this.clientesService.getHistorialDespachos(id);
  }
}
