# 📋 Sistema de Monitoreo de Licencias de Conducir

## 🎯 Descripción General

Sistema completo de monitoreo automático para licencias de conducción y revisiones técnicas de flota. Implementado con un **Cron Job diario en Node.js** y componentes React interactivos en el frontend.

### ¿Qué hace?

✅ **Cada medianoche**, un job automatizado:
- Consulta la BD de licencias y revisiones técnicas
- Identifica documentos que vencen en **exactamente 30 días**
- Crea alertas en la tabla `alertas_sistema`
- Evita duplicados automáticamente

✅ **Frontend React** muestra:
- Campanita con contador de alertas
- Banner prominente para alertas urgentes
- Dropdown con lista de alertas
- Estadísticas en tiempo real
- Botones para marcar como leído/descartar

---

## 📦 Entregables Implementados

### 1. Backend Node.js + Express (`backend/`)

**Archivos clave:**
- `src/server.js` - Servidor principal Express
- `src/cron/monitoringCron.js` - Definición y gestión del cron job
- `src/services/licenseMonitoringService.js` - Lógica de escaneo de licencias
- `src/services/alertService.js` - Gestión de alertas
- `src/routes/alertRoutes.js` - Endpoints API REST
- `src/lib/supabaseClient.js` - Cliente Supabase con Service Key
- `src/utils/` - Helpers de fecha y logging

**Dependencias:**
```json
{
  "@supabase/supabase-js": "^2.39.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "node-cron": "^3.0.2"
}
```

### 2. Frontend React (`src/components/` y `src/hooks/`)

**Componentes nuevos:**

| Componente | Función |
|-----------|---------|
| `LicenseMonitoringDashboard.jsx` | Dashboard completo con alertas y estadísticas |
| `LicenseAlertBanner.jsx` | Banner + campanita de notificaciones |
| `LicenseAlertBanner.css` | Estilos del banner |
| `LicenseMonitoringDashboard.css` | Estilos del dashboard |

**Hooks nuevos:**

| Hook | Función |
|-----|---------|
| `useLicenseAlerts.js` | Consume API backend, polling cada 30s |

### 3. Base de Datos (SQL)

**Archivo:** `MIGRACIONES_ALERTAS.sql`

Conteniene:
- ✅ Tabla `alertas_sistema` completa
- ✅ Tablas `licencias_conducir` y `revisiones_tecnicas`
- ✅ Índices para optimización
- ✅ Triggers para auditoría
- ✅ Constraints y validaciones
- ✅ Ejemplos de queries

### 4. Documentación

| Archivo | Contenido |
|---------|----------|
| `backend/README.md` | Documentación específica del backend |
| `GUIA_INSTALACION.md` | Guía paso a paso de instalación |
| `MIGRACIONES_ALERTAS.sql` | Script SQL de base de datos |

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# Instalar y ejecutar
npm install
npm run dev
```

**Esperado:**
```
✅ SUCCESS: 🚀 Servidor corriendo en puerto 3001
✅ SUCCESS: ⏰ Iniciando Cron Job con expresión: 0 0 * * *
```

### 2. Frontend

```bash
cd ..

# Configurar variables de entorno
cat > .env << EOF
REACT_APP_SUPABASE_URL=tu-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-key
REACT_APP_BACKEND_URL=http://localhost:3001
EOF

# Instalar y ejecutar
npm install
npm start
```

### 3. Base de Datos

En Supabase Console → SQL Editor:
```sql
-- Copiar y ejecutar contenido de MIGRACIONES_ALERTAS.sql
```

### 4. Usar en App.js

```jsx
import LicenseMonitoringDashboard from "./components/LicenseMonitoringDashboard";

function App() {
  return (
    <div>
      <LicenseMonitoringDashboard />
      {/* Tu contenido */}
    </div>
  );
}
```

---

## 📊 Estructura de Datos

### Tabla: `alertas_sistema`

```sql
CREATE TABLE alertas_sistema (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50),                    -- "vencimiento_licencia" | "vencimiento_revision_tecnica"
  prioridad VARCHAR(20),               -- "Crítica" | "Alta" | "Normal" | "Baja"
  descripcion TEXT,                    -- Ej: "Alerta: La licencia del chofer Juan vence el 2026-05-13"
  estado VARCHAR(20) DEFAULT 'No leída', -- "No leída" | "Leída"
  entidad_id BIGINT,                   -- ID del conductor o camión
  entidad_tipo VARCHAR(50),            -- "conductor" | "camion"
  relacionado_id BIGINT,               -- ID de la licencia/revisión
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_lectura TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Alertas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alerts` | Todas las alertas |
| GET | `/api/alerts/unread` | Solo no leídas |
| GET | `/api/alerts/stats` | Estadísticas |
| PUT | `/api/alerts/:id/read` | Marcar 1 como leída |
| PUT | `/api/alerts/read-multiple` | Marcar múltiples |
| DELETE | `/api/alerts/:id` | Eliminar alerta |
| POST | `/api/alerts/run-job` | Ejecutar job (dev) |

### Health

| Método | Endpoint |
|--------|----------|
| GET | `/health` |
| GET | `/api/info` |

**Ejemplo:**
```bash
curl http://localhost:3001/api/alerts/unread | jq .
```

---

## ⚙️ Configuración del Cron Job

**En `.env`:**
```env
CRON_TIME=0 0 * * *
```

**Formato cron:**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ minuto  │ hora    │ día     │ mes     │ día-sem │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 0-59    │ 0-23    │ 1-31    │ 1-12    │ 0-7     │
└─────────┴─────────┴─────────┴─────────┴─────────┘

Ejemplos:
  0 0 * * *    → 00:00 todos los días (medianoche)
  0 9 * * *    → 09:00 todos los días
  0 2 * * 0    → 02:00 cada domingo
  */30 * * * * → Cada 30 minutos
```

---

## 🎨 Componentes React

### LicenseMonitoringDashboard

Dashboard completo con:
- Banner de alertas principales
- Estadísticas en grid responsivo
- Lista detallada de alertas
- Botones para marcar/descartar
- Estados de carga y error

```jsx
<LicenseMonitoringDashboard />
```

### LicenseAlertBanner

Componente standalone:
- Campanita con badge
- Dropdown de alertas
- Banner prominente (cuando hay alertas urgentes)

```jsx
const { alerts, markAsRead, deleteAlert } = useLicenseAlerts();

<LicenseAlertBanner
  alerts={alerts}
  onMarkAsRead={markAsRead}
  onDismiss={deleteAlert}
/>
```

### useLicenseAlerts Hook

Hook personalizado que:
- Hace polling cada 30 segundos
- Maneja estados de carga/error
- Proporciona funciones de gestión

```jsx
const {
  alerts,              // Array
  loading,             // Boolean
  error,               // String | null
  markAsRead,          // Function
  deleteAlert,         // Function
  getStats,            // Function
  fetchAlerts,         // Function
} = useLicenseAlerts();
```

---

## 🔍 Monitoreo y Logs

El backend genera logs detallados:

```
[13/4/2026, 00:00:00] ✅ SUCCESS: 🚀 Servidor corriendo en puerto 3001
[13/4/2026, 00:00:05] ℹ️ INFO: Iniciando Cron Job con expresión: 0 0 * * *
[13/4/2026, 00:00:10] ✅ SUCCESS: ⏰ Ejecutando Cron Job de Monitoreo
[13/4/2026, 00:00:15] ✅ SUCCESS: Licencias encontradas: 5
[13/4/2026, 00:00:20] ✅ SUCCESS: Alerta creada: Atención: La licencia del chofer Juan vence el 2026-05-13
```

---

## 🐛 Solución de Problemas

### "Cannot find alertas_sistema table"
→ Ejecuta `MIGRACIONES_ALERTAS.sql` en Supabase Console

### "SUPABASE_SERVICE_KEY is missing"
→ Copia `.env.example` a `.env` y completa con credenciales

### "Backend connection failed"
→ Verifica que backend corra en puerto 3001 y revisa `REACT_APP_BACKEND_URL`

### "Alertas se duplican"
→ El sistema evita duplicados automáticamente. Si ocurren, limpia manualmente con SQL

Ver más en `GUIA_INSTALACION.md` →  Troubleshooting

---

## 📂 Estructura de Archivos

```
ing-de-software-2/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Servidor Express principal
│   │   ├── cron/
│   │   │   └── monitoringCron.js    # Definición del cron job
│   │   ├── services/
│   │   │   ├── licenseMonitoringService.js
│   │   │   └── alertService.js
│   │   ├── routes/
│   │   │   └── alertRoutes.js        # Endpoints API
│   │   ├── lib/
│   │   │   └── supabaseClient.js
│   │   └── utils/
│   │       ├── dateHelpers.js
│   │       └── logger.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── src/
│   ├── components/
│   │   ├── LicenseMonitoringDashboard.jsx
│   │   ├── LicenseMonitoringDashboard.css
│   │   ├── LicenseAlertBanner.jsx
│   │   └── LicenseAlertBanner.css
│   └── hooks/
│       └── useLicenseAlerts.js
├── MIGRACIONES_ALERTAS.sql
└── GUIA_INSTALACION.md
```

---

## ✨ Característica Principales

- ✅ **Cron automático** - Se ejecuta a medianoche sin intervención
- ✅ **Prevención de duplicados** - Verifica antes de crear alertas
- ✅ **Polling en frontend** - Actualización cada 30 segundos
- ✅ **UI responsivo** - Funciona en desktop/mobile
- ✅ **Manejo de errores** - Try-catch en todas las operaciones
- ✅ **Logging detallado** - Trazabilidad completa
- ✅ **Endpoints REST** - API limpia y documentada
- ✅ **Índices SQL** - Optimizado para queries rápidas

---

## 🚀 Próximas Mejoras (Opcional)

- [ ] Webhooks en lugar de polling
- [ ] Notificaciones por email/SMS
- [ ] Dashboard de administración avanzada
- [ ] Exportar reportes de alertas
- [ ] Integración con calendario
- [ ] Autenticación y autorización por rol
- [ ] Tests unitarios e integración
- [ ] Docker compose para despliegue

---

## 📞 Soporte

Consulta `GUIA_INSTALACION.md` para:
- Instrucciones detalladas
- Ejemplos de código
- Solución de problemas
- Uso avanzado

---

**Versión:** 1.0.0  
**Fecha:** Abril 13, 2026  
**Estado:** ✅ Completo y funcional
