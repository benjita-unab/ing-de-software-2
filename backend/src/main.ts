import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  console.log('BACKEND ENV CHECK:', {
    DEBUG_EMAIL_defined: !!process.env.DEBUG_EMAIL,
    DEBUG_PASSWORD_defined: !!process.env.DEBUG_PASSWORD,
    JWT_SECRET_defined: !!process.env.JWT_SECRET,
  });

  // Desactivamos el bodyParser default de Nest para poder definir nuestros
  // propios límites (las fichas de despacho llegan como base64 ~5–15 MB).
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    bodyParser: false,
  });

  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
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
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Backend iniciado en http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('❌ Error iniciando la aplicación:', err);
  process.exit(1);
});
