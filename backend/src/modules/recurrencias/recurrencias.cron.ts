import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrenciasService } from './recurrencias.service';

@Injectable()
export class RecurrenciasCronService {
  private readonly logger = new Logger(RecurrenciasCronService.name);

  constructor(private readonly recurrenciasService: RecurrenciasService) {}

  /** HU-47: revisión diaria de recurrencias activas (06:00 UTC ≈ 03:00 Chile invierno). */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleRecurrenciasDiarias() {
    this.logger.log('Iniciando job de recurrencias de pedidos…');
    const result = await this.recurrenciasService.procesarRecurrenciasVencidas();
    this.logger.log(
      `Job recurrencias: procesadas=${result.procesadas}, generadas=${result.generadas}, fallidas=${result.fallidas}`,
    );
  }
}
