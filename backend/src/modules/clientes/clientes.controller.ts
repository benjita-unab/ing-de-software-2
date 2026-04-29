import {
  Controller,
  Post,
  Get,
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
   * Lista todos los clientes.
   */
  @Get()
  @UseGuards(JwtGuard)
  async listClientes() {
    return await this.clientesService.listClientes();
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
}
