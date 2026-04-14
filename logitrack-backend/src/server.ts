import { createApp } from './app';
import { config } from './config';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     LogiTrack Backend — API Gateway      ║
  ╠══════════════════════════════════════════╣
  ║  Port:    ${config.port}                          ║
  ║  Env:     ${config.nodeEnv.padEnd(30)}║
  ╚══════════════════════════════════════════╝
  `);
  console.log(`[GET] http://localhost:${config.port}/health`);
  console.log(`[POST] http://localhost:${config.port}/api/storage/upload`);
  console.log(`[POST] http://localhost:${config.port}/api/trazabilidad`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
