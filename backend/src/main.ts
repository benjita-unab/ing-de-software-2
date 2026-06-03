import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  console.log('BACKEND ENV CHECK:', {
    JWT_SECRET_defined: !!process.env.JWT_SECRET,
    SUPABASE_URL_defined: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY_defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  // Desactivamos el bodyParser default de Nest para poder definir nuestros
  // propios límites (las fichas de despacho llegan como base64 ~5–15 MB).
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    bodyParser: false,
  });

  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://ing-de-software-2.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/ing-de-software-2.*\.vercel\.app$/.test(origin) ||
        /^https:\/\/.*\.trycloudflare\.com$/.test(origin);

      if (isAllowed) return callback(null, true);

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
