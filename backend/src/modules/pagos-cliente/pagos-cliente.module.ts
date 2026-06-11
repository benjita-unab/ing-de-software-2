/**
 * HU-34 — Pagos cliente B2B.
 * PagosClienteService.crearPago se exporta para invocación desde Rutas/Portal (Transbank).
 * Este módulo HTTP no crea pagos manualmente; solo consulta y cambio de estado.
 */
import { Module } from '@nestjs/common';
import { SupabaseConfigService } from '../../config/supabase.config';
import { ConfiguracionPagosModule } from '../configuracion-pagos/configuracion-pagos.module';
import { PagosClienteController } from './pagos-cliente.controller';
import { PagosClienteService } from './pagos-cliente.service';

@Module({
  imports: [ConfiguracionPagosModule],
  providers: [PagosClienteService, SupabaseConfigService],
  controllers: [PagosClienteController],
  exports: [PagosClienteService],
})
export class PagosClienteModule {}
