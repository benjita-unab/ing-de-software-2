import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Módulos de rutas
import storageRoutes      from './modules/storage/storage.routes';
import trazabilidadRoutes from './modules/trazabilidad/trazabilidad.routes';
import signaturesRoutes   from './modules/signatures/signatures.routes';
import dispatchRoutes     from './modules/dispatch/dispatch.routes';
import routesRoutes       from './modules/routes/routes.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    // En producción, reemplaza '*' con el dominio real de tu cliente
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ─── Logging ────────────────────────────────────────────────────────────────
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

  // ─── Body Parsers ───────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── Health Check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/storage',     storageRoutes);
  app.use('/api/trazabilidad', trazabilidadRoutes);
  app.use('/api/signatures',  signaturesRoutes);
  app.use('/api/dispatch',    dispatchRoutes);
  app.use('/api/routes',      routesRoutes);

  // ─── 404 Handler ────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // ─── Centralized Error Handler ──────────────────────────────────────────────
  // Debe ir DESPUÉS de todas las rutas
  app.use(errorHandler);

  return app;
}
