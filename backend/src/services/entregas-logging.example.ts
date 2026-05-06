import { Injectable, Logger } from '@nestjs/common';
import { LogsQueryService } from './logs-query.service';

/**
 * Servicio de ejemplo que demuestra:
 * - Inyección del Logger
 * - Diferentes niveles de logging
 * - Manejo de errores con stack traces
 * - Logging de operaciones asincrónicas
 */
@Injectable()
export class EntregasLoggingExampleService {
  private readonly logger = new Logger(EntregasLoggingExampleService.name);

  constructor(private logsQuery: LogsQueryService) {}

  /**
   * Ejemplo 1: Logging básico en operación CRUD
   */
  async crearEntrega(entregaData: any): Promise<any> {
    const startTime = Date.now();
    const entregaId = `ENT-${Date.now()}`;

    this.logger.log(
      `Creando nueva entrega: ${entregaId}`,
      'CrearEntrega',
    );

    try {
      // Simular validación
      if (!entregaData.clienteId) {
        this.logger.warn(
          `Cliente no especificado para entrega ${entregaId}`,
          'ValidacionDatos',
        );
        throw new Error('Cliente es requerido');
      }

      // Simular inserción en BD
      this.logger.debug(
        `Insertando entrega en BD: ${JSON.stringify(entregaData)}`,
        'DatabaseOperation',
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Entrega ${entregaId} creada exitosamente en ${duration}ms`,
        'CrearEntrega',
      );

      return { id: entregaId, ...entregaData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error creando entrega: ${errorMessage}`,
        error instanceof Error ? error.stack : '',
        'CrearEntrega',
      );
      throw error;
    }
  }

  /**
   * Ejemplo 2: Logging de operaciones con múltiples pasos
   */
  async procesarEntregas(entregaIds: string[]): Promise<Map<string, any>> {
    const batchId = `BATCH-${Date.now()}`;
    this.logger.log(
      `Procesando lote de ${entregaIds.length} entregas`,
      `ProcesarEntregas[${batchId}]`,
    );

    const resultados = new Map<string, any>();

    for (const entregaId of entregaIds) {
      try {
        this.logger.debug(
          `Procesando entrega: ${entregaId}`,
          `ProcesarEntregas[${batchId}]`,
        );

        // Simular procesamiento
        await new Promise((resolve) => setTimeout(resolve, 100));

        this.logger.log(
          `Entrega ${entregaId} procesada`,
          `ProcesarEntregas[${batchId}]`,
        );

        resultados.set(entregaId, { status: 'success' });
      } catch (error) {
        this.logger.error(
          `Fallo procesando ${entregaId}`,
          error instanceof Error ? error.stack : String(error),
          `ProcesarEntregas[${batchId}]`,
        );
        resultados.set(entregaId, { status: 'failed', error: String(error) });
      }
    }

    this.logger.log(
      `Lote ${batchId} completado: ${resultados.size} entregas procesadas`,
      `ProcesarEntregas[${batchId}]`,
    );

    return resultados;
  }

  /**
   * Ejemplo 3: Logging con metadata estructurada
   */
  async registrarViaje(conductorId: string, rutaId: string, datos: any): Promise<void> {
    const viajeId = `VIJ-${Date.now()}`;

    this.logger.log(
      `Viaje registrado: ${viajeId}`,
      'RegistroViaje',
    );

    // Simular envío de datos con metadata
    this.logger.debug(
      `Viaje ${viajeId} - Datos completos registrados`,
      {
        viajeId,
        conductorId,
        rutaId,
        timestamp: new Date().toISOString(),
        distancia: datos.distancia || 0,
        duracion: datos.duracion || 0,
      } as any,
    );
  }

  /**
   * Ejemplo 4: Consultar logs relacionados a entregas
   */
  async obtenerHistorialEntrega(entregaId: string): Promise<any[]> {
    try {
      this.logger.log(
        `Obteniendo historial de entrega: ${entregaId}`,
        'ConsultaHistorial',
      );

      // Consultar logs de esta entrega
      const logs = await this.logsQuery.searchLogs(entregaId);

      this.logger.log(
        `Historial recuperado: ${logs.length} eventos encontrados`,
        'ConsultaHistorial',
      );

      return logs;
    } catch (error) {
      this.logger.error(
        `Error obteniendo historial`,
        error instanceof Error ? error.stack : String(error),
        'ConsultaHistorial',
      );
      return [];
    }
  }

  /**
   * Ejemplo 5: Logging de operaciones largas con progreso
   */
  async sincronizarEntregas(cantidad: number): Promise<void> {
    const sincroId = `SYNC-${Date.now()}`;

    this.logger.log(
      `Iniciando sincronización de ${cantidad} entregas`,
      `Sincronizacion[${sincroId}]`,
    );

    let exitosas = 0;
    let fallidas = 0;

    for (let i = 0; i < cantidad; i++) {
      try {
        // Simular sincronización
        if (Math.random() > 0.9) {
          throw new Error('Fallo temporal de conexión');
        }
        exitosas++;

        // Log cada 10 entregas
        if ((i + 1) % 10 === 0) {
          this.logger.debug(
            `Progreso: ${i + 1}/${cantidad} entregas sincronizadas`,
            `Sincronizacion[${sincroId}]`,
          );
        }
      } catch (error) {
        fallidas++;
        this.logger.warn(
          `Fallo en entrega ${i + 1}/${cantidad}`,
          `Sincronizacion[${sincroId}]`,
        );
      }
    }

    this.logger.log(
      `Sincronización completada: ${exitosas} exitosas, ${fallidas} fallidas`,
      `Sincronizacion[${sincroId}]`,
    );
  }

  /**
   * Ejemplo 6: Logging de errores críticos
   */
  async procesarPagoEntrega(entregaId: string, monto: number): Promise<boolean> {
    try {
      this.logger.log(
        `Procesando pago de $${monto} para entrega ${entregaId}`,
        'ProcesosPago',
      );

      // Simular procesamiento de pago
      if (monto <= 0) {
        throw new Error('Monto inválido');
      }

      this.logger.log(
        `Pago exitoso para entrega ${entregaId}`,
        'ProcesosPago',
      );

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error crítico procesando pago para ${entregaId}: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
        'ProcesosPago',
      );
      return false;
    }
  }
}
