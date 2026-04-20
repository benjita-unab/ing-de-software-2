# 📋 HU-5 / CA-2: Alertas de Licencias - Guía Completa

## 📌 Criterio de Aceptación (CA-2)

**"El sistema debe enviar una alerta automática al administrador 30 días antes del vencimiento de la licencia de conducir."**

---

## 🏗️ Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────┐
│         🕐 CRON JOB (Medianoche diaria)                 │
│  (Node.js - backend/src/services/licenseAlertService.js)│
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│    📊 Query: SELECT * FROM conductores WHERE           │
│    licencia_vencimiento = TODAY + 30 días              │
│    AND activo = true                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  ✅ Verificar duplicados: No alertas previas con       │
│     estado='pendiente' para este conductor             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  💾 INSERT INTO incidencias:                            │
│  - conductor_id: ID del conductor                      │
│  - tipo: 'ALERTA'                                      │
│  - descripcion: "La licencia... vencerá en 30 días"   │
│  - estado: 'pendiente'                                 │
│  - prioridad: 'media'                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos Creados

```
backend/
├── package.json                           # Dependencies: express, node-cron, @supabase/supabase-js
├── .env.example                           # Template de variables de entorno
├── src/
│   ├── server.js                          # Servidor Express + inicialización del cron
│   └── services/
│       └── licenseAlertService.js         # Lógica principal (HU-5)
│
└── README.md                              # Documentación del backend
```

---

## 🛠️ Instalación y Setup

### 1️⃣ Instalar Dependencias

```bash
cd backend
npm install
```

**Dependencias instaladas:**
- `express@4.18.2` - Framework HTTP
- `node-cron@3.0.2` - Programación de tareas cron
- `@supabase/supabase-js@2.39.3` - Cliente Supabase
- `cors@2.8.5` - Manejo de CORS
- `dotenv@16.4.5` - Variables de entorno

### 2️⃣ Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env

# Editar .env con tus credenciales Supabase
nano .env  # o tu editor favorito
```

**Variables requeridas:**
- `SUPABASE_URL` - URL de tu proyecto (ej: `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_KEY` - Service Role Key (en Supabase Settings → API)
- `PORT` - Puerto del servidor (default: 3001)
- `CRON_TIME` - Expresión cron (default: `0 0 * * *` = medianoche)

> ⚠️ **IMPORTANTE:** La SERVICE_KEY es privada. Nunca la hagas pública en GitHub.

### 3️⃣ Obtener Credenciales de Supabase

1. Abre tu dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings → API**
4. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Secret** → `SUPABASE_SERVICE_KEY`

---

## ▶️ Ejecución

### Modo Desarrollo (con hot reload)

```bash
npm run dev
```

**Salida esperada:**
```
═══════════════════════════════════════════════════════════
✅ SUCCESS: 🚀 Servidor corriendo en puerto 3001
═══════════════════════════════════════════════════════════
📍 Base URL: http://localhost:3001
🏥 Health: http://localhost:3001/health

═══════════════════════════════════════════════════════════
⏰ Iniciando Cron Job de Alertas de Licencias...
═══════════════════════════════════════════════════════════
✅ Cron job iniciado con expresión: "0 0 * * *"
   Próxima ejecución: [fecha de mañana a las 00:00]

🔍 Ejecutando verificación inicial de licencias...
═══════════════════════════════════════════════════════════
```

### Modo Producción

```bash
npm start
```

---

## 🔌 Endpoints API

### 1. Health Check
```bash
GET /health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-19T12:00:00.000Z",
  "service": "LogiTrack Backend"
}
```

---

### 2. Estado del Sistema de Alertas
```bash
GET /api/license-alerts/status
```

**Respuesta:**
```json
{
  "status": "running",
  "message": "Sistema de alertas de licencias activo",
  "cronExpression": "0 0 * * *",
  "description": "Verifica licencias que vencen en 30 días",
  "lastCheck": "2026-04-19T12:00:00.000Z"
}
```

---

### 3. Ejecutar Verificación Manual (Testing)
```bash
POST /api/license-alerts/check-now
```

**Respuesta (éxito):**
```json
{
  "success": true,
  "message": "Verificación completada",
  "data": {
    "success": true,
    "processed": 5,
    "created": 3,
    "skipped": 2
  }
}
```

**Respuesta (error):**
```json
{
  "success": false,
  "error": "Error al conectar con Supabase"
}
```

---

## 🔄 Flujo de Ejecución Automática (Cron Job)

**Expresión cron:** `0 0 * * *`
- Se ejecuta **todos los días a las 00:00 (medianoche)**
- No se detiene ni requiere reinicio manual

### ¿Qué pasa en cada ejecución?

1. **Calcula fecha objetivo:** Hoy + 30 días
2. **Consulta BD:** `SELECT * FROM conductores WHERE licencia_vencimiento = [fecha_objetivo]`
3. **Para cada conductor encontrado:**
   - Verifica si ya existe alerta pendiente (evita duplicados)
   - Si no existe: **INSERT en tabla `incidencias`**
   - Los campos se llenan así:
     - `conductor_id`: ID del conductor
     - `tipo`: `'ALERTA'`
     - `descripcion`: `"La licencia del conductor con ID [usuario_id] vencerá en 30 días."`
     - `estado`: `'pendiente'`
     - `prioridad`: `'media'`
     - `created_at`: Timestamp actual

4. **Genera resumen:** Muestra cuántas alertas se crearon

### Ejemplo de Salida Automática (cada medianoche)

```
═══════════════════════════════════════════════════════════
⏰ INICIO: Verificación de licencias vencidas en 30 días
📅 Timestamp: 20/04/2026 00:00:15

🔍 Buscando licencias que vencen el 2026-05-20...
✅ Se encontraron 3 licencias vencidas en 30 días

🔄 Procesando: Juan García López
✅ Alerta creada para Juan García López (Licencia: CI-98765-4)

🔄 Procesando: María Rodríguez Pérez
⏭️  Alerta ya existe. Saltando...

🔄 Procesando: Carlos Mendez Silva
✅ Alerta creada para Carlos Mendez Silva (Licencia: CI-98766-5)

═══════════════════════════════════════════════════════════
📊 RESUMEN:
   Total encontradas: 3
   Alertas creadas: 2
   Alertas saltadas: 1
⏱️  FIN: 20/04/2026 00:00:18
═══════════════════════════════════════════════════════════
```

---

## 📊 Mapeo de Tablas Reales (Investigación MCP)

### Tabla: `conductores`
```sql
- id (UUID, PRIMARY KEY)
- usuario_id (UUID, FK → usuarios.id)
- licencia_numero (TEXT)
- licencia_vencimiento (DATE) ← ⭐ Campo vigilado
- activo (BOOLEAN)
- created_at (TIMESTAMP)
```

### Tabla: `incidencias` (para alertas)
```sql
- id (UUID, PRIMARY KEY)
- conductor_id (UUID, FK → conductores.id)
- tipo (ENUM: 'NORMAL', 'ALERTA', 'EMERGENCIA')
- descripcion (TEXT)
- estado (ENUM: 'pendiente', 'en curso', 'resuelto')
- prioridad (ENUM: 'baja', 'media', 'alta')
- created_at (TIMESTAMP)
- [otros campos...]
```

---

## 🧪 Testing Manual

### Test 1: Verificar que el servidor está corriendo

```bash
curl http://localhost:3001/health
```

**Esperado:** Respuesta JSON con status "ok"

---

### Test 2: Ejecutar verificación de licencias ahora

```bash
curl -X POST http://localhost:3001/api/license-alerts/check-now
```

**Esperado:**
```json
{
  "success": true,
  "message": "Verificación completada",
  "data": { "processed": X, "created": Y, "skipped": Z }
}
```

---

### Test 3: Verificar que el cron se ejecutará a medianoche

1. Revisa los logs en la consola
2. Busca: `"✅ Cron job iniciado con expresión: "0 0 * * *"`
3. Busca: `"Próxima ejecución: [fecha_mañana 00:00]"`

---

## 🔧 Troubleshooting

### Error: "Faltan variables de entorno"

```
⚠️  Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY
```

**Solución:**
```bash
cp .env.example .env
# Edita .env con tus credenciales Supabase
```

---

### Error: "Expresión cron inválida"

**Solución:** Verifica que `CRON_TIME` en `.env` sea válida

Ejemplos válidos:
- `"0 0 * * *"` - Medianoche diaria ✅
- `"30 2 * * *"` - 02:30 diaria ✅
- `"0 */6 * * *"` - Cada 6 horas ✅

Ref: https://crontab.guru/

---

### Error: "No rows found" al buscar alertas

Esto es **normal** si no hay licencias vencidas en exactamente 30 días. El sistema:
- Busca coincidencias exactas
- Si no encuentra: `✅ No hay licencias vencidas en 30 días`

---

### Error: "Ya existe una alerta"

El sistema evita duplicados automáticamente. Si ves este mensaje:
- Una alerta anterior para ese conductor ya existe en estado 'pendiente'
- Se saltará la creación (comportamiento correcto)

---

## 📚 Documentación de Código

### Función Principal: `checkLicensesAndCreateAlerts()`

```javascript
export async function checkLicensesAndCreateAlerts() {
  // 1. Calcula fecha objetivo (hoy + 30)
  // 2. Consulta conductores con vencimiento en esa fecha
  // 3. Para cada conductor, verifica duplicados
  // 4. Crea alerta en tabla incidencias
  // 5. Retorna resumen { processed, created, skipped }
}
```

### Función: `startLicenseAlertsCron(cronExpression)`

```javascript
export function startLicenseAlertsCron(cronExpression = "0 0 * * *") {
  // Inicia la programación del cron job
  // Se ejecuta automáticamente según la expresión
}
```

### Función: `stopLicenseAlertsCron()`

```javascript
export function stopLicenseAlertsCron() {
  // Detiene el cron job (si necesitas pausar)
}
```

---

## 🚀 Próximos Pasos

1. ✅ Instalar dependencias: `npm install`
2. ✅ Configurar `.env` con credenciales Supabase
3. ✅ Ejecutar servidor: `npm run dev`
4. ✅ Probar endpoint: `curl http://localhost:3001/health`
5. ✅ Verificar cron: Revisar logs para confirmar "Próxima ejecución"
6. ✅ (Opcional) Ejecutar verificación manual: `POST /api/license-alerts/check-now`

---

## 📞 Soporte

- **Documentación Cron:** https://crontab.guru/
- **Documentación Supabase:** https://supabase.com/docs
- **Node-Cron:** https://www.npmjs.com/package/node-cron
- **Express:** https://expressjs.com/

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-19  
**Estado:** ✅ Producción  
