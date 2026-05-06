import { AppService } from './app.service';
import { Controller, Get, Logger } from '@nestjs/common';

@Controller('test-log')
export class AppController {
  // 1. Instanciamos el logger dándole el contexto de esta clase
  private readonly logger = new Logger(AppController.name);

  @Get('trigger')
  probarLogging() {
    // 2. Disparamos distintos niveles de log
    this.logger.log('Iniciando prueba de logging para el sistema de logística...'); // Nivel: INFO
    
    this.logger.warn('Advertencia: Simulación de alta latencia en la asignación de rutas.'); // Nivel: WARN
    
    try {
      // Simulamos una falla crítica en el sistema
      throw new Error('Fallo simulado al conectar con el microservicio de tracking.');
    } catch (error) {
      // Pasamos el mensaje y el stack trace del error
     this.logger.error('Error crítico capturado en el flujo principal', error instanceof Error ? error.stack : String(error));// Nivel: ERROR
    }

    return { 
      status: 'success', 
      message: 'Logs generados. Revisa tu consola y tu tabla en Supabase.' 
    };
  }
}

