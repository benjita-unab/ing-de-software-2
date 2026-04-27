import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getInfo() {
    return {
      name: 'LogiTrack Backend API',
      version: '1.0.0',
      description: 'Backend centralizado para sistema de logística',
      modules: ['conductores', 'rutas', 'entregas'],
      endpoints: {
        conductores: '/api/conductores',
        rutas: '/api/rutas',
        entregas: '/api/entregas',
      },
    };
  }
}
