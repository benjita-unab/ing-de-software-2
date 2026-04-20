# 🚀 LogiTrack Backend

Backend Node.js + Express para el sistema de logística LogiTrack.

## ✨ Características

- **🕐 Alertas Automáticas de Licencias** - Verificación diaria a medianoche de licencias que vencen en 30 días
- **📊 API REST** - Endpoints para monitoreo y operaciones manuales
- **🔐 Integración Supabase** - Base de datos PostgreSQL con Service Key authentication
- **📝 Logging Detallado** - Salida completa de operaciones del cron job
- **⚡ Hot Reload** - Desarrollo rápido con `--watch`

## 📋 Requisitos Previos

- **Node.js** ≥ 18.0.0
- **npm** o **yarn**
- **Proyecto Supabase** activo con tablas:
  - `conductores` (licencia_numero, licencia_vencimiento)
  - `incidencias` (para almacenar alertas)

## 🔧 Instalación

### 1. Clonar/Acceder al proyecto

```bash
cd backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales Supabase
```

**Variables requeridas:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
CRON_TIME=0 0 * * *
```

> 🔑 Obtén estas credenciales en [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/[ID]/settings/api)

## ▶️ Ejecución

### Desarrollo (con hot reload)

```bash
npm run dev
```

### Producción

```bash
npm start
```

## 📡 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info del servicio |
| GET | `/health` | Health check |
| GET | `/api/license-alerts/status` | Estado del sistema de alertas |
| POST | `/api/license-alerts/check-now` | Ejecutar verificación manual |

## 🕐 Cron Job Automático

**Expresión:** `0 0 * * *` (Medianoche diaria)

Se ejecuta automáticamente todos los días a las 00:00 y:
1. Busca licencias que vencen exactamente en 30 días
2. Crea alertas en la tabla `incidencias`
3. Evita duplicados automáticamente
4. Genera reporte en logs

## 📁 Estructura

```
backend/
├── src/
│   ├── server.js                    # Servidor Express principal
│   └── services/
│       └── licenseAlertService.js  # Lógica de alertas HU-5
├── .env.example                    # Template de variables
├── package.json                    # Dependencies
└── HU-5-GUIA-COMPLETA.md          # Documentación detallada
```

## 🧪 Testing

### Verificar que el servidor está corriendo

```bash
curl http://localhost:3001/health
```

### Ejecutar verificación de licencias ahora

```bash
curl -X POST http://localhost:3001/api/license-alerts/check-now
```

## 📊 Mapeo de Base de Datos

**Tabla monitoreada:** `conductores`
- Columna clave: `licencia_vencimiento` (DATE)

**Tabla de alertas:** `incidencias`
- Se inserta con tipo='ALERTA', estado='pendiente', prioridad='media'

## 🔗 Integración con Frontend

El frontend React consume las alertas a través de la API o directamente de Supabase:

```javascript
// Endpoint para obtener alertas pendientes
GET /api/license-alerts/status

// O consultar Supabase directamente
supabase
  .from('incidencias')
  .select('*')
  .eq('tipo', 'ALERTA')
  .eq('estado', 'pendiente')
```

## 📚 Documentación Completa

Ver [HU-5-GUIA-COMPLETA.md](./HU-5-GUIA-COMPLETA.md) para:
- Arquitectura detallada
- Flujo de ejecución completo
- Troubleshooting
- Ejemplos de respuestas API

## 🚀 Deployment

### Heroku

```bash
npm install -g heroku-cli
heroku login
heroku create your-app-name
git push heroku main
heroku config:set SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
CMD ["npm", "start"]
```

## 📞 Soporte

- **Issues:** Reporta problemas en el repositorio
- **Cron Reference:** https://crontab.guru/
- **Supabase Docs:** https://supabase.com/docs
- **Express Docs:** https://expressjs.com/

## 📄 Licencia

MIT

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-19
