import { Injectable, Logger } from '@nestjs/common';

/**
 * Ejemplo de servicio que demuestra cómo inyectar y usar el Logger de Winston
 * en NestJS de manera correcta.
 */
@Injectable()
export class LoggerExampleService {
  // Crear una instancia del logger con el contexto del servicio
  private readonly logger = new Logger(LoggerExampleService.name);

  /**
   * Ejemplo de método que usa diferentes niveles de logging
   */
  exampleMethod(userId: string, action: string): void {
    // Log de nivel INFO - información general
    this.logger.log(`Usuario ${userId} realizó la acción: ${action}`);

    try {
      // Simular procesamiento
      const startTime = Date.now();
      // ... lógica del negocio ...
      const duration = Date.now() - startTime;

      // Log de DEBUG - información detallada para desarrollo
      this.logger.debug(
        `Procesamiento completado en ${duration}ms`,
        'ProcessingTime',
      );
    } catch (error) {
      // Log de ERROR - errores críticos con stack trace
      this.logger.error(
        `Error procesando acción para usuario ${userId}`,
        error instanceof Error ? error.stack : String(error),
        'ExampleMethod',
      );
    }
  }

  /**
   * Ejemplo con logging de advertencia
   */
  validateData(data: any): boolean {
    if (!data || Object.keys(data).length === 0) {
      // Log de WARN - situaciones inusuales pero no críticas
      this.logger.warn('Datos vacíos recibidos en validación', 'DataValidation');
      return false;
    }

    this.logger.log('Validación de datos completada exitosamente');
    return true;
  }

  /**
   * Ejemplo de logging con contexto y metadata
   */
  processDelivery(deliveryId: string, status: string, metadata?: Record<string, any>): void {
    this.logger.log(
      `Entrega ${deliveryId} actualizada a estado: ${status}`,
      'DeliveryStatus',
    );

    if (metadata) {
      this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`, 'DeliveryMetadata');
    }
  }
}
