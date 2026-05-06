import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SupabaseTransport } from './config/supabase.transport';
import { loggerConfig } from './config/logger.config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as dotenv from 'dotenv';
dotenv.config(); // Fuerza la carga del .env antes de inicializar cualquier módulo
 
async function bootstrap() {
  // Crear la aplicación con el logger de Winston
  const app = await NestFactory.create(AppModule, {
    logger: loggerConfig,
    bodyParser: false,
  });

  // Obtener la instancia del logger para logs de inicialización
  const logger = new Logger('Bootstrap');

  // Log de validación de variables de entorno
  logger.log(
    'Validación de variables de entorno: DEBUG_EMAIL, DEBUG_PASSWORD y JWT_SECRET están configuradas',
    'ConfigValidation',
  );

  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://192.168.0.3:3000',
      'http://192.168.0.4:3000',
      /https:\/\/.*\.trycloudflare\.com$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.log(`${req.method} ${req.url}`, 'HTTP');
    next();
  });

  // Security
  app.use(helmet());
  app.use(compression());

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  console.log(`🚀 Intentando abrir el puerto ${port}...`);
  await app.listen(port);
  logger.log(`✅ Backend iniciado en http://localhost:${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('❌ Error iniciando la aplicación:', err);
  process.exit(1);
});
