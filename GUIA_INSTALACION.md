# Guía Completa de Instalación y Uso

## Sistema de Monitoreo de Licencias y Revisiones Técnicas

Este documento proporciona las instrucciones completas para instalar y usar el sistema de monitoreo de licencias de conducir y revisiones técnicas de flota.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación del Backend](#instalación-del-backend)
3. [Instalación del Frontend](#instalación-del-frontend)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Uso del Sistema](#uso-del-sistema)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- **Node.js** versión 18+ instalado
- **npm** (gestor de paquetes de Node.js)
- Acceso a **Supabase** (cuenta crear si no tienes)
- **Git** para clonar/actualizar el repositorio
- Un editor de código (VS Code recomendado)

### Verificar instalación:
```bash
node --version     # Debe ser v18.0.0 o superior
npm --version      # Debe estar disponible
```

---

## 🚀 Instalación del Backend

### Paso 1: Navegar a la carpeta backend

```bash
cd backend
```

### Paso 2: Copiar archivo de variables de entorno

```bash
cp .env.example .env
```

### Paso 3: Configurar variables de entorno

Edita el archivo `.env` con tus credenciales de Supabase:

```env
# Obtén estos valores desde tu dashboard de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configuración del servidor
PORT=3001
NODE_ENV=development

# Configuración del Cron Job
# Formato: "minuto hora día mes día-semana"
# "0 0 * * *" = Cada día a las 00:00
CRON_TIME=0 0 * * *
```

**¿Dónde obtener estas credenciales?**
1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Abre **Settings → API**
3. Copia la **Project URL** → `SUPABASE_URL`
4. Copia la **Service Key** → `SUPABASE_SERVICE_KEY`

### Paso 4: Instalar dependencias

```bash
npm install
```

### Paso 5: Iniciar el servidor

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

Deberías ver:
```
✅ SUCCESS: 🚀 Servidor corriendo en puerto 3001
✅ SUCCESS: ⏰ Iniciando Cron Job con expresión: 0 0 * * *
✅ SUCCESS: ✅ Backend Logitrack iniciado correctamente
```

---

## 💻 Instalación del Frontend

### Paso 1: Navegar a la carpeta raíz del proyecto

```bash
cd ..  # Volver a la raíz
```

### Paso 2: Crear archivo .env

```bash
# En la raíz del proyecto (mismo nivel que src/)
cat > .env << EOF
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_BACKEND_URL=http://localhost:3001
EOF
```

**Configuración de variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `REACT_APP_SUPABASE_URL` | URL de tu proyecto Supabase | `https://myproj.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Clave pública de Supabase | `eyJ...` |
| `REACT_APP_BACKEND_URL` | URL del backend | `http://localhost:3001` |

### Paso 3: Instalar dependencias (si no lo has hecho)

```bash
npm install
```

### Paso 4: Iniciar la aplicación React

```bash
npm start
```

La aplicación debería abrirse en `http://localhost:3000`

### Paso 5: Integrar componentes en tu App

En tu archivo principal `src/App.js`:

```jsx
import LicenseMonitoringDashboard from "./components/LicenseMonitoringDashboard";
import LicenseAlertBanner from "./components/LicenseAlertBanner";

function App() {
  return (
    <div>
      {/* Opción 1: Dashboard completo */}
      <LicenseMonitoringDashboard />
      
      {/* Opción 2: Solo el banner (integrable en header) */}
      <LicenseAlertBanner alerts={[]} onMarkAsRead={() => {}} />
      
      {/* Tu contenido */}
    </div>
  );
}
```

---

## 🗄️ Configuración de Base de Datos

### Paso 1: Crear tabla de alertas

En tu consola de Supabase (SQL Editor):

```sql
-- Ejecutar el archivo MIGRACIONES_ALERTAS.sql completo
-- o copiar y pegar cada sección

-- Tabla principal de alertas
CREATE TABLE IF NOT EXISTS alertas_sistema (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'Normal',
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'No leída',
  entidad_id BIGINT NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  relacionado_id BIGINT,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_lectura TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_alertas_estado ON alertas_sistema(estado);
CREATE INDEX idx_alertas_entidad ON alertas_sistema(entidad_id, entidad_tipo);
CREATE INDEX idx_alertas_fecha ON alertas_sistema(fecha_creacion DESC);
```

### Paso 2: Verificar tablas de licencias y revisiones

Asegúrate de que existan estas tablas con la estructura correcta:

**licencias_conducir:**
- `id` (PK)
- `conductor_id` (FK)
- `numero_licencia` (VARCHAR)
- `fecha_vencimiento` (DATE)
- `estado` (VARCHAR)

**revisiones_tecnicas:**
- `id` (PK)
- `camion_id` (FK)
- `numero_revision` (VARCHAR)
- `fecha_vencimiento` (DATE)
- `estado` (VARCHAR)

Si necesitas crear estas tablas, usa el archivo `MIGRACIONES_ALERTAS.sql`

### Paso 3: Habilitar Realtime (Opcional)

Para obtener actualizaciones en tiempo real en el frontend:

1. Ve a tu tablea en Supabase
2. Click en **"Realtime"** en el menu superior
3. Activa los eventos: **INSERT**, **UPDATE**, **DELETE**

---

## 📊 Uso del Sistema

### Iniciar el flujo completo

**Terminal 1** (Backend):
```bash
cd backend
npm run dev
```

**Terminal 2** (Frontend):
```bash
npm start
```

### Acceder a los endpoints

#### Obtener alertas no leídas
```bash
curl http://localhost:3001/api/alerts/unread
```

Respuesta:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tipo": "vencimiento_licencia",
      "prioridad": "Alta",
      "descripcion": "Atención: La licencia del chofer Juan vence el 2026-05-13",
      "estado": "No leída",
      "fecha_creacion": "2026-04-13T00:00:00Z"
    }
  ]
}
```

#### Marcar alerta como leída
```bash
curl -X PUT http://localhost:3001/api/alerts/1/read
```

#### Obtener estadísticas
```bash
curl http://localhost:3001/api/alerts/stats
```

### Probar el cron job manualmente

En desarrollo, puedes ejecutar el job de forma manual:

```bash
curl -X POST http://localhost:3001/api/alerts/run-job
```

Esto ejecutará inmediatamente todo el proceso de monitoreo sin esperar a la medianoche.

---

## 🎨 Componentes React Disponibles

### 1. LicenseMonitoringDashboard

Dashboard completo con alertas, estadísticas y lista detallada.

```jsx
import LicenseMonitoringDashboard from "./components/LicenseMonitoringDashboard";

function App() {
  return <LicenseMonitoringDashboard />;
}
```

**Features:**
- Banner de alertas principales
- Grid de estadísticas
- Lista detallada de todas las alertas
- Botones para marcar como leída/descartar
- Diseño responsivo

### 2. LicenseAlertBanner

Componente standalone de banner + campanita.

```jsx
import LicenseAlertBanner from "./components/LicenseAlertBanner";
import useLicenseAlerts from "./hooks/useLicenseAlerts";

function Header() {
  const { alerts, markAsRead, deleteAlert } = useLicenseAlerts();
  
  return (
    <header>
      <h1>Mi App</h1>
      <LicenseAlertBanner
        alerts={alerts}
        onMarkAsRead={markAsRead}
        onDismiss={deleteAlert}
      />
    </header>
  );
}
```

**Features:**
- Campanita con badge de conteo
- Dropdown con lista de alertas
- Banner prominente para alertas de alta prioridad
- Acciones rápidas

### 3. Hook: useLicenseAlerts

Hook personalizado para gestionar alertas.

```jsx
import useLicenseAlerts from "./hooks/useLicenseAlerts";

function MyComponent() {
  const {
    alerts,           // Array de alertas
    loading,          // Boolean de carga
    error,            // String de error (si existe)
    markAsRead,       // Función(alertId)
    deleteAlert,      // Función(alertId)
    getStats,         // Función async que retorna stats
    fetchAlerts,      // Función para refrescar manualmente
  } = useLicenseAlerts();

  return (
    <div>
      {loading && <p>Cargando...</p>}
      {error && <p>Error: {error}</p>}
      {alerts.map(a => (
        <div key={a.id}>
          <p>{a.descripcion}</p>
          <button onClick={() => markAsRead(a.id)}>Leído</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_SERVICE_KEY are missing"

**Solución:**
1. Verifica que el archivo `.env` esté en la carpeta `backend/` (no en `backend/src/`)
2. Reinicia el servidor después de crear el `.env`

```bash
# Correcto
backend/
  ├── .env
  ├── package.json
  └── src/
```

### Error: "Cannot connect to backend"

**Solución:**
1. Verifica que el backend esté corriendo en el puerto 3001
2. Revisa tu `.env` en la raíz del proyecto:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:3001
   ```
3. Desde el navegador, prueba: `http://localhost:3001/health`

### Error: "Unable to fetch alerts from database"

**Solución:**
1. Verifica que el SUPABASE_SERVICE_KEY sea correcto (start con `eyJ...`)
2. Asegúrate de que la tabla `alertas_sistema` existe
3. Revisa en la consola SQL: `SELECT COUNT(*) FROM alertas_sistema;`

### Las alertas se duplican

**Solución:**
1. El sistema evita duplicados por defecto
2. Si ves duplicados, ejecuta en la consola SQL:
   ```sql
   DELETE FROM alertas_sistema 
   WHERE id NOT IN (
     SELECT MIN(id) FROM alertas_sistema 
     GROUP BY tipo, entidad_id, estado
   );
   ```

### El cron job no se ejecuta

**Solución:**
1. Verifica la expresión cron en `.env`:
   ```env
   CRON_TIME=0 0 * * *  # Correcto
   ```
2. Prueba manualmente:
   ```bash
   curl -X POST http://localhost:3001/api/alerts/run-job
   ```
3. Revisa los logs del servidor

### Las alertas no se actualizan en el frontend

**Solución:**
1. Por defecto, se actualiza cada 30 segundos
2. Verifica: `REACT_APP_BACKEND_URL` en `.env`
3. Abre DevTools (F12) → Console para ver errores
4. Prueba manualmente:
   ```bash
   curl http://localhost:3001/api/alerts/unread
   ```

---

## 📝 Ejemplos de Uso Avanzado

### Personalizar intervalo de polling

```jsx
// Descomentar y editar en src/hooks/useLicenseAlerts.js
const POLL_INTERVAL = 10000; // 10 segundos en lugar de 30
```

### Agregar sonido a las alertas

```jsx
function LicenseAlertBanner({ alerts }) {
  useEffect(() => {
    if (alerts.length > 0) {
      new Audio("/notification.mp3").play();
    }
  }, [alerts.length]);
  
  return <div>...</div>;
}
```

### Filtrar solo alertas críticas

```jsx
const { alerts } = useLicenseAlerts();
const criticalAlerts = alerts.filter(a => a.prioridad === "Crítica");
```

### Integración con notificaciones del navegador

```jsx
function showNotification(alert) {
  if (Notification.permission === "granted") {
    new Notification("Alerta de Licencia", {
      body: alert.descripcion,
      icon: "⚠️"
    });
  }
}
```

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola del servidor (`backend`)
2. Abre DevTools en el navegador (F12) para ver errores
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de que Supabase esté accesible

---

## 📅 La tarea se ejecutará automáticamente

El cron job está configurado para ejecutarse **diariamente a las 00:00** (medianoche).

Para cambiar la hora, edita el `.env`:
```env
CRON_TIME=0 9 * * *    # Cambiar a las 09:00
CRON_TIME=0 */6 * * *  # Cada 6 horas
```

---

**Última actualización:** Abril 13, 2026
**Versión:** 1.0.0
