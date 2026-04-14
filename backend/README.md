# Backend Logitrack - API REST

## Descripción
Backend Node.js con Express para el sistema de gestión logística. Incluye un cron job diario que monitorea el vencimiento de licencias de conducir y revisiones técnicas.

## Características
- ✅ Cron Job automático para monitoreo de vencimientos (configurable)
- ✅ API REST para gestionar alertas
- ✅ Integración con Supabase PostgreSQL
- ✅ Logging detallado
- ✅ Prevención de alertas duplicadas

## Instalación

### 1. Configuración de variables de entorno
Crea un archivo `.env` en la raíz de la carpeta `backend`:

```bash
cp .env.example .env
```

Luego edita `.env` con tus credenciales:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
PORT=3001
NODE_ENV=development
CRON_TIME=0 0 * * *
```

### 2. Instalar dependencias

```bash
npm install
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Configuración del Cron Job

La expresión CRON_TIME usa el formato estándar de cron:

```
┌───────────┬─────────────────────────────────────
│  Minuto   │ Hora │ Día │ Mes │ Día-Semana
│           │      │     │     │
│  0-59     │ 0-23 │ 1-31│ 1-12│ 0-7
└───────────┴─────────────────────────────────────

Ejemplos:
  "0 0 * * *"     → 00:00 todos los días
  "0 9 * * *"     → 09:00 todos los días
  "0 2 * * 0"     → 02:00 cada domingo
  "*/30 * * * *"  → Cada 30 minutos
```

## Endpoints API

### Alertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts` | Obtiene todas las alertas |
| GET | `/api/alerts/unread` | Obtiene alertas no leídas |
| GET | `/api/alerts/stats` | Obtiene estadísticas |
| PUT | `/api/alerts/:id/read` | Marca una alerta como leída |
| PUT | `/api/alerts/read-multiple` | Marca múltiples alertas |
| DELETE | `/api/alerts/:id` | Elimina una alerta |
| POST | `/api/alerts/run-job` | Ejecuta job manualmente (dev) |

### Salud

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/info` | Información del servidor |

## Ejemplos de Uso

### Obtener alertas no leídas
```bash
curl http://localhost:3001/api/alerts/unread
```

### Marcar alerta como leída
```bash
curl -X PUT http://localhost:3001/api/alerts/1/read
```

### Marcar múltiples alertas como leídas
```bash
curl -X PUT http://localhost:3001/api/alerts/read-multiple \
  -H "Content-Type: application/json" \
  -d '{"alertIds": [1, 2, 3]}'
```

### Ejecutar job manualmente (desarrollo)
```bash
curl -X POST http://localhost:3001/api/alerts/run-job
```

## Estructura de Base de Datos

### Tabla: `alertas_sistema`

```sql
CREATE TABLE alertas_sistema (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  prioridad VARCHAR(20) DEFAULT 'Normal',
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'No leída',
  entidad_id BIGINT NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  relacionado_id BIGINT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_lectura TIMESTAMP
);

CREATE INDEX idx_estado ON alertas_sistema(estado);
CREATE INDEX idx_entidad ON alertas_sistema(entidad_id, entidad_tipo);
```

## Tablas Requeridas

El cron job espera las siguientes tablas en Supabase:

- `licencias_conducir` - Licencias de conducción de choferes
- `revisiones_tecnicas` - Revisiones técnicas de camiones
- `conductores` - Información de conductores
- `camiones` - Información de camiones
- `usuarios` - Información de usuarios

## Logs

El sistema genera logs detallados con timestamps:

```
[13/4/2026, 00:00:00] ✅ SUCCESS: Alerta creada: Atención: La licencia del chofer Juan vence el 2026-05-13
[13/4/2026, 00:05:30] ℹ️ INFO: Licencias encontradas: 5
[13/4/2026, 00:10:15] ⚠️ WARN: Alerta ya existe para conductor María. Omitiendo...
```

## Troubleshooting

### "Faltan las variables SUPABASE_URL y SUPABASE_SERVICE_KEY"
Asegúrate de que el archivo `.env` esté creado correctamente en `backend/` (no en `backend/src/`).

### Cron job no se ejecuta
Verifica que CRON_TIME tenga una expresión válida. Usa el endpoint `/api/alerts/run-job` para probar manualmente.

### Las alertas se duplican
El sistema verifica automáticamente si ya existe una alerta del mismo tipo para la misma entidad. Si ves duplicados, revisa manualmente la tabla.

## Licencia
MIT
