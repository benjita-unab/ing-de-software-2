# 🚀 LogiTrack Backend API

Backend centralizado para el sistema de logística LogiTrack. Construido con **NestJS**, **TypeScript** y **Supabase**.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Seguridad](#seguridad)
- [Despliegue](#despliegue)
- [Troubleshooting](#troubleshooting)

---

## ✨ Características

✅ **Autenticación JWT** - Validación de tokens Supabase  
✅ **Validación de Licencias** - Verificación automática de licencias vigentes  
✅ **Subida de Documentos** - Upload seguro a Supabase Storage  
✅ **Gestión de Rutas** - Asignación de conductores y validaciones  
✅ **Cierre de Entregas** - Generación de PDF y envío de comprobantes  
✅ **Email Transaccional** - Integración con Resend  
✅ **Tipo Seguro** - Código 100% TypeScript  
✅ **Docker Ready** - Dockerfile multi-stage optimizado  

---

## 📦 Requisitos

- **Node.js** 18+ (recomendado 20)
- **npm** 9+ o **pnpm**
- **Docker & Docker Compose** (para despliegue)
- **Cuenta Supabase** con Service Role Key
- **Cuenta Resend** para emails

---

## 🔧 Instalación

### 1. Clonar y navegar al directorio backend

```bash
cd backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear archivo `.env`

Copia el archivo `.env.example` y completa con tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con:
- `SUPABASE_URL` - URL de tu proyecto
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key (⚠️ SECRETO)
- `SUPABASE_PUBLIC_KEY` - Public Key para JWT
- `RESEND_API_KEY` - API Key de Resend

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# Supabase (obligatorio)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_PUBLIC_KEY=eyJhbGc...

# Resend (obligatorio para emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@tudominio.com

# Opcional
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### Configuración de Supabase

1. Crea los Storage buckets:
   - `driver_licenses` - Licencias de conductores
   - `entregas` - Firmas, fotos y comprobantes

2. Habilita RLS (Row Level Security) en las tablas críticas

3. Crea políticas de seguridad según sea necesario

---

## ▶️ Ejecución

### Desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### Producción

```bash
npm run build
npm run start:prod
```

### Con Docker Compose

```bash
docker-compose up -d
```

Logs:
```bash
docker-compose logs -f logitrack-backend
```

---

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── main.ts                      # Punto de entrada
│   ├── app.module.ts                # Módulo raíz
│   ├── app.controller.ts            # Controlador principal
│   ├── app.service.ts               # Servicio principal
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── user.decorator.ts    # @CurrentUser()
│   │   ├── guards/
│   │   │   └── jwt.guard.ts         # Protección de rutas
│   │   └── strategies/
│   │       └── jwt.strategy.ts      # Estrategia JWT
│   │
│   ├── config/
│   │   ├── supabase.config.ts       # Cliente Supabase
│   │   └── resend.config.ts         # Cliente Resend
│   │
│   └── modules/
│       ├── conductores/             # Módulo de conductores
│       │   ├── conductores.controller.ts
│       │   ├── conductores.service.ts
│       │   └── conductores.module.ts
│       ├── rutas/                   # Módulo de rutas
│       │   ├── rutas.controller.ts
│       │   ├── rutas.service.ts
│       │   └── rutas.module.ts
│       └── entregas/                # Módulo de entregas
│           ├── entregas.controller.ts
│           ├── entregas.service.ts
│           └── entregas.module.ts
│
├── test/
├── Dockerfile                       # Build multi-stage
├── docker-compose.yml               # Desarrollo
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 📡 API Endpoints

### Health Check

```
GET /health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### 🚗 Conductores

#### Subir Licencia

```
POST /api/conductores/upload-license
Authorization: Bearer {JWT}
Content-Type: multipart/form-data

Body:
- file: (archivo PDF/JPG/PNG, max 5MB)
- expiryDate: "2025-12-31"
```

#### Validar Estado de Licencia

```
GET /api/conductores/:id/license-status
Authorization: Bearer {JWT}
```

Respuesta:
```json
{
  "isValid": true,
  "status": "VALID",
  "message": "Licencia vigente",
  "expiryDate": "2025-12-31",
  "daysUntilExpiry": 320
}
```

#### Obtener Detalles del Conductor

```
GET /api/conductores/:id
Authorization: Bearer {JWT}
```

#### Listar Conductores Activos

```
GET /api/conductores
Authorization: Bearer {JWT}
```

---

### 🗺️ Rutas

#### Asignar Conductor a Ruta

```
POST /api/rutas/assign
Authorization: Bearer {JWT}
Content-Type: application/json

Body:
{
  "rutaId": "uuid-xxx",
  "conductorId": "uuid-xxx",
  "camionId": "uuid-xxx",
  "cargaRequeridaKg": 1000
}
```

#### Obtener Rutas Sin Asignar

```
GET /api/rutas/unassigned
Authorization: Bearer {JWT}
```

#### Obtener Información de Ruta

```
GET /api/rutas/:id
Authorization: Bearer {JWT}
```

#### Cambiar Estado de Ruta

```
PATCH /api/rutas/:id/status
Authorization: Bearer {JWT}
Content-Type: application/json

Body:
{
  "estado": "EN_PROCESO"
}
```

Estados válidos: `PENDIENTE`, `ASIGNADA`, `EN_PROCESO`, `ENTREGADA`, `CANCELADA`

---

### 📦 Entregas

#### Cerrar Entrega (generar PDF + email)

```
POST /api/entregas/:rutaId/close
Authorization: Bearer {JWT}
Content-Type: application/json

Body:
{
  "clienteEmail": "cliente@example.com"  // Opcional
}
```

#### Guardar Firma

```
POST /api/entregas/:rutaId/signature
Authorization: Bearer {JWT}
Content-Type: application/json

Body:
{
  "base64Signature": "data:image/png;base64,..."
}
```

#### Guardar Foto de Ficha

```
POST /api/entregas/:rutaId/photo
Authorization: Bearer {JWT}
Content-Type: application/json

Body:
{
  "base64Photo": "data:image/jpeg;base64,..."
}
```

#### Obtener Estado de Entrega

```
GET /api/entregas/:rutaId
Authorization: Bearer {JWT}
```

---

## 🔐 Seguridad

### Autenticación JWT

Todos los endpoints (excepto health check) requieren un JWT válido de Supabase:

```
Authorization: Bearer {JWT}
```

El middleware valida automáticamente:
- ✅ Firma del token
- ✅ Expiración
- ✅ Audiencia (aud)
- ✅ Emisor (iss)

### Protección de Secretos

⚠️ **NUNCA** exponga en el frontend:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

Estas claves deben permanecer solo en el backend.

### CORS

Por defecto, se permiten requests desde:
- `http://localhost:3000`
- `http://localhost:19006` (Expo)
- Variable `FRONTEND_URL`

---

## 🐳 Despliegue

### Docker Swarm

1. Build de la imagen:

```bash
docker build -t logitrack-backend:latest .
```

2. Push a tu registry:

```bash
docker tag logitrack-backend:latest tu-registry/logitrack-backend:latest
docker push tu-registry/logitrack-backend:latest
```

3. Deploy en Swarm:

```bash
docker service create \
  --name logitrack-backend \
  --publish 3000:3000 \
  --env-file .env \
  --limit-memory 512M \
  --limit-cpus 1 \
  tu-registry/logitrack-backend:latest
```

### Dokploy

1. Conecta tu repositorio a Dokploy
2. Selecciona la rama `main`
3. Configura las variables de entorno
4. Deploy automático en cada push

---

## 🔧 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"

```bash
# Verificar que .env existe
cat .env

# Asegúrate de que las variables están configuradas
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Error: "Invalid token"

```bash
# Verificar que SUPABASE_PUBLIC_KEY es correcta
# Obtén del dashboard de Supabase > Settings > API
```

### Error: "CORS blocked"

Añade tu URL de frontend a la variable `FRONTEND_URL` en `.env`

### Error: "Email not sent"

```bash
# Verificar que RESEND_API_KEY es válida
# Verificar que RESEND_FROM_EMAIL está verificado en Resend
```

---

## 📚 Documentación Adicional

- [NestJS Docs](https://docs.nestjs.com)
- [Supabase Docs](https://supabase.com/docs)
- [Resend Docs](https://resend.com/docs)
- [JWT en NestJS](https://docs.nestjs.com/security/authentication)

---

## 📄 Licencia

MIT

---

**¿Necesitas ayuda?** Crea un issue en el repositorio o contacta al equipo de desarrollo.
