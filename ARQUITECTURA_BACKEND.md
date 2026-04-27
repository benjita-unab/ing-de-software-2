# 📐 Plan de Migración Arquitectónica — Backend Centralizado

## 1. AUDITORÍA DE RIESGOS 🚨

### Lógica actualmente dispersa en Frontend:

| Ubicación | Función | Riesgo | Prioridad |
|-----------|---------|--------|-----------|
| `rutasService.js` | `validarLicenciaConductor()` | Validación bypaseable desde cliente | CRÍTICA |
| `rutasService.js` | `asignarConductorARuta()` | Asignación sin control de autorización | CRÍTICA |
| `LicenseUploadForm.jsx` | Upload a Storage + Update BD | Acceso directo a BD, sin auditoría | ALTA |
| `cierreDespachoService.ts` | `cerrarDespachoYEnviarComprobante()` | Lógica financiera sin control | CRÍTICA |
| `cierreDespachoService.ts` | `guardarFirmaEnSupabase()` | Firma sin validación | ALTA |
| `cierreDespachoService.ts` | `subirFotoFichaEnSupabase()` | Foto sin metadatos | MEDIA |
| `emailService.ts` | Envío de correos | API key de Resend expuesta 🔴 | CRÍTICA |

### Variables de Entorno Comprometidas:

```
Frontend Web:
- REACT_APP_SUPABASE_URL ✓ (OK, es pública)
- REACT_APP_SUPABASE_ANON_KEY ⚠️ (Debe restringirse con RLS)

Mobile (Expo):
- EXPO_PUBLIC_RESEND_API_KEY 🔴 (¡NUNCA debe estar en cliente!)
- EXPO_PUBLIC_RESEND_FROM_EMAIL ⚠️ (Debería ser configurado en backend)
```

---

## 2. ARQUITECTURA PROPUESTA 🏗️

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Web + Mobile)                       │
│  React + React Native → Llamadas HTTP con JWT autenticado       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Authorization: Bearer {JWT_SUPABASE}
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  API GATEWAY (Node.js/NestJS)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Middleware:                                                 │ │
│  │ • JWT Verification (Supabase tokens)                        │ │
│  │ • Rate Limiting                                             │ │
│  │ • Request Logging                                           │ │
│  │ • Error Handling                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Conductores │ │    Rutas     │ │  Entregas    │             │
│  │  Module     │ │   Module     │ │   Module     │             │
│  └─────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  Controllers → Services → Repository → Supabase SDK             │
└────────────────────────┬────────────────────────────────────────┘
                         │ Service Role Key (secreto)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                        │
│  • conductores (licencia_vencimiento)                           │
│  • driver_licenses (file_url, status, expiry_date)             │
│  • rutas (conductor_id, camion_id, estado)                     │
│  • entregas (firma_url, foto_url, validado)                    │
│  • Storage: driver_licenses, firmas, fichas_despacho           │
└────────────────────────────────────────────────────────────────┘

External Services:
┌────────────────────────────────────────────────────────────────┐
│  Resend (Email) - Llamado desde Backend (API key segura)       │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. ESTRUCTURA DE CARPETAS — NestJS 📁

```
backend/
├── src/
│   ├── main.ts                          # Punto de entrada
│   ├── app.module.ts                    # Módulo raíz
│   ├── .env.example                     # Variables de entorno
│   │
│   ├── common/
│   │   ├── middleware/
│   │   │   └── jwt.middleware.ts         # JWT Verification
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # Error handling
│   │   ├── guards/
│   │   │   └── jwt.guard.ts              # JWT Guard
│   │   └── decorators/
│   │       └── user.decorator.ts         # @CurrentUser() decorator
│   │
│   ├── config/
│   │   ├── supabase.config.ts            # Supabase client (Service Role)
│   │   ├── resend.config.ts              # Resend client
│   │   └── env.validation.ts             # Validación de variables
│   │
│   ├── modules/
│   │   ├── conductores/
│   │   │   ├── conductores.module.ts
│   │   │   ├── conductores.controller.ts
│   │   │   ├── conductores.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── upload-license.dto.ts
│   │   │   │   └── validate-license.dto.ts
│   │   │   └── entities/
│   │   │       └── conductor.entity.ts
│   │   │
│   │   ├── rutas/
│   │   │   ├── rutas.module.ts
│   │   │   ├── rutas.controller.ts
│   │   │   ├── rutas.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── assign-route.dto.ts
│   │   │   │   └── get-routes.dto.ts
│   │   │   └── entities/
│   │   │       └── ruta.entity.ts
│   │   │
│   │   └── entregas/
│   │       ├── entregas.module.ts
│   │       ├── entregas.controller.ts
│   │       ├── entregas.service.ts
│   │       ├── dto/
│   │       │   ├── close-delivery.dto.ts
│   │       │   ├── save-signature.dto.ts
│   │       │   └── save-photo.dto.ts
│   │       └── entities/
│   │           └── entrega.entity.ts
│   │
│   └── utils/
│       ├── storage.helper.ts             # Funciones de Storage
│       ├── email.helper.ts               # Template de emails
│       └── pdf.helper.ts                 # Generación de PDFs
│
├── test/
│   └── conductores.service.spec.ts
│
├── Dockerfile                            # Multi-stage
├── docker-compose.yml                    # Dev environment
├── .env.example                          # Template variables
├── package.json
├── nest-cli.json
├── tsconfig.json
└── README.md

```

---

## 4. PLAN DE MIGRACIÓN POR MÓDULO 📋

### **FASE 1: MÓDULO CONDUCTORES** ⭐
**Archivos a reemplazar:**
- ✅ `rutasService.js` → `conductores.service.ts` (validarLicenciaConductor)
- ✅ `LicenseUploadForm.jsx` → Endpoint POST `/conductores/upload-license`

**Endpoints:**
```
POST   /api/conductores/upload-license        # Subir licencia
GET    /api/conductores/:id/license-status    # Obtener estado de licencia
GET    /api/conductores                       # Listar conductores activos
GET    /api/conductores/:id                   # Obtener detalles
```

**Lógica centralizada:**
- Validar JWT de Supabase
- Validar archivo (tipo, tamaño)
- Subir a Storage con Service Role Key
- Guardar metadatos en `driver_licenses`
- Actualizar `conductores.licencia_vencimiento`
- Auditar en log

---

### **FASE 2: MÓDULO RUTAS** 🗺️
**Archivos a reemplazar:**
- ✅ `rutasService.js` → `rutas.service.ts` (asignarConductorARuta)
- ✅ `AsignacionRutas.jsx` → Llamadas a new endpoints

**Endpoints:**
```
POST   /api/rutas/assign                     # Asignar conductor + camión
GET    /api/rutas                            # Listar rutas sin asignar
GET    /api/rutas/:id                        # Obtener detalles de ruta
PATCH  /api/rutas/:id/status                 # Cambiar estado
```

**Lógica centralizada:**
- Validar licencia (llama a `conductoresService.validateLicense()`)
- Validar capacidad del camión
- Validar permisos (solo admin/dispatcher)
- Actualizar estado de ruta
- Crear evento en `historial_estados`

---

### **FASE 3: MÓDULO ENTREGAS** 📦
**Archivos a reemplazar:**
- ✅ `cierreDespachoService.ts` → Todos sus métodos en `entregas.service.ts`

**Endpoints:**
```
POST   /api/entregas/:rutaId/close           # Cerrar entrega + enviar comprobante
POST   /api/entregas/:rutaId/signature       # Guardar firma
POST   /api/entregas/:rutaId/photo           # Guardar foto de ficha
GET    /api/entregas/:rutaId                 # Obtener estado
```

**Lógica centralizada:**
- Generar PDF del comprobante
- **Enviar email via Resend (desde Backend)** ✅
- Marcar como `validado`
- Almacenar firma con metadatos
- Almacenar foto con geolocalización
- Crear evento de trazabilidad

---

## 5. SEGURIDAD: FLUJO DE AUTENTICACIÓN 🔐

```
Frontend solicita:
┌────────────────────────────────────────────────────┐
│ POST /api/conductores/upload-license               │
│ Authorization: Bearer eyJhbGc...                    │
│ Content-Type: multipart/form-data                  │
│ Body: { file, expiryDate }                         │
└─────────────────┬──────────────────────────────────┘
                  │
Backend JWT Middleware:
┌─────────────────▼──────────────────────────────────┐
│ 1. Extraer token del header                        │
│ 2. Validar firma con PUBLIC KEY de Supabase        │
│ 3. Extraer userId y roles del token                │
│ 4. Inyectar @CurrentUser() en controller           │
└─────────────────┬──────────────────────────────────┘
                  │
Controller:
┌─────────────────▼──────────────────────────────────┐
│ @Post('upload-license')                            │
│ @UseGuards(JwtGuard)                               │
│ uploadLicense(@CurrentUser() user, @Body() dto) {  │
│   // user.id ya está validado                      │
│   return this.conductoresService.uploadLicense()   │
│ }                                                  │
└─────────────────┬──────────────────────────────────┘
                  │
Service (Supabase Admin):
┌─────────────────▼──────────────────────────────────┐
│ • Usa SUPABASE_SERVICE_ROLE_KEY (solo en backend) │
│ • Acceso completo a Storage y BD                   │
│ • Audita todas las operaciones                     │
└────────────────────────────────────────────────────┘
```

---

## 6. VARIABLES DE ENTORNO 🔑

**Backend (.env):**
```env
# Supabase (Admin)
SUPABASE_URL=https://jmshzmwhbbufgxgxlpcd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Supabase (Public - for JWT validation)
SUPABASE_PUBLIC_KEY=eyJhbGc...

# Resend (API Email)
RESEND_API_KEY=re_...

# App Config
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

**Frontend Web (.env):**
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SUPABASE_URL=https://jmshzmwhbbufgxgxlpcd.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc... (usar RLS)
```

**Mobile (.env):**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://jmshzmwhbbufgxgxlpcd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (usar RLS)
```

---

## 7. MATRIZ DE TRANSICIÓN 📊

| Función | Ubicación Actual | Ubicación Nueva | Cambio en Frontend | Status |
|---------|------------------|-----------------|-------------------|--------|
| validarLicenciaConductor | rutasService.js | Backend API | Endpoint call | 🔄 |
| asignarConductorARuta | rutasService.js | Backend API | Endpoint call | 🔄 |
| uploadLicense | LicenseUploadForm.jsx | Backend API | Endpoint call | 🔄 |
| cerrarDespacho | cierreDespachoService.ts | Backend API | Endpoint call | 🔄 |
| guardarFirma | cierreDespachoService.ts | Backend API | Endpoint call | 🔄 |
| enviarEmail | emailService.ts | Backend (Resend) | Automático | ✅ |

---

## 8. DESPLIEGUE EN DOKPLOY 🐳

```yaml
Service: logitrack-backend
Docker Image: Multi-stage (builder + runtime)
Port: 3000
Environment:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - RESEND_API_KEY
  - NODE_ENV=production
Health Check: GET /health
Replica Count: 3
```

---

## 9. ROLLBACK STRATEGY 🔄

Si algo falla:
1. Frontend continúa con JWT existente
2. Endpoints no migrados aún siguen usando cliente directo
3. Edge Functions de Supabase como fallback
4. Base de datos sin cambios (solo lectura de nuevos campos)

