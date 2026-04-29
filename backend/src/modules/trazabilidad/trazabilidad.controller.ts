import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { TrazabilidadService } from './trazabilidad.service';

@Controller('api/trazabilidad')
export class TrazabilidadController {
  constructor(private readonly trazabilidadService: TrazabilidadService) {}

  @Post()
  async createEvent(
    @Body()
    body: {
      id?: string;
      etapa?: string;
      foto_uri?: string | null;
      latitud?: unknown;
      longitud?: unknown;
      timestamp_evento?: string;
      // Opcional. Cuando mobile lo envíe, se persistirá si la columna
      // existe en la BD (ver migración recomendada en docs).
      ruta_id?: string | null;
    },
  ) {
    console.log('BODY TRAZABILIDAD:', body);

    const { id, etapa, foto_uri, latitud, longitud, timestamp_evento, ruta_id } =
      body;

    if (typeof id !== 'string' || !id.trim()) {
      throw new BadRequestException('id es requerido');
    }

    if (typeof etapa !== 'string' || !etapa.trim()) {
      throw new BadRequestException('etapa es requerida');
    }

    if (typeof timestamp_evento !== 'string' || !timestamp_evento.trim()) {
      throw new BadRequestException('timestamp_evento es requerido');
    }

    if (typeof latitud !== 'number' || typeof longitud !== 'number') {
      throw new BadRequestException('latitud y longitud deben ser números');
    }

    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      throw new BadRequestException('latitud y longitud deben ser números válidos');
    }

    return this.trazabilidadService.createEvent({
      id,
      etapa,
      foto_uri: foto_uri ?? null,
      latitud,
      longitud,
      timestamp_evento,
      ruta_id:
        typeof ruta_id === 'string' && ruta_id.trim() ? ruta_id.trim() : null,
    });
  }
}
