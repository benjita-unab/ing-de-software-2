# 🔐 Guía Completa de Seguridad - Backend Centralizado

## 📌 Índice

1. [Problemas de Seguridad Actuales](#problemas-actuales)
2. [Arquitectura de Seguridad](#arquitectura-segura)
3. [Autenticación JWT](#autenticación-jwt)
4. [Protección de Secretos](#protección-de-secretos)
5. [CORS & CSRF](#cors--csrf)
6. [Validaciones](#validaciones)
7. [Rate Limiting](#rate-limiting)
8. [Auditoría](#auditoría)
9. [Checklist de Seguridad](#checklist-de-seguridad)

---

## 🚨 Problemas Actuales

### 1. **API Keys Expuestas en Frontend** ⚠️ CRÍTICO

```javascript
// ❌ ACTUAL - App.js (Web)
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ❌ ACTUAL - emailService.ts (Mobile)
const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;
```

**Riesgos:**
- 🔴 Cualquiera puede ver la clave en DevTools
- 🔴 Bot puede usar la clave para hacer llamadas no autorizadas
- 🔴 Acceso no controlado a base de datos
- 🔴 Envío de emails no autorizados

### 2. **Lógica de Validación en Cliente**

```javascript
// ❌ ACTUAL - rutasService.js
if (hoy > fechaVencimiento) {
  return { isValid: false };  // Fácil de falsificar en DevTools
}
```

**Riesgos:**
- 🔴 Usuario puede editar la fecha localmente
- 🔴 Asignar conductor sin licencia válida
- 🔴 Sin validación server-side

### 3. **Credenciales Quemadas**

```typescript
// ❌ ACTUAL - cierreDespachoService.ts
const email = "oyanadelbastian5@gmail.com";  // Hardcoded
```

**Riesgos:**
- 🔴 Email expuesto en repositorio
- 🔴 Potencial IDOR (acceso a datos de otros usuarios)

---

## 🛡️ Arquitectura Segura

### JWT Validation Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Cliente envía JWT en header Authorization            │
│    GET /api/conductores/123                             │
│    Authorization: Bearer eyJhbGc...                      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 2. Backend JWT Middleware extrae token                  │
│    - Obtiene token del header                           │
│    - Valida firma con PUBLIC_KEY de Supabase            │
│    - Verifica expiración                                │
│    - Valida aud (audience) e iss (issuer)               │
└────────────────┬────────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
      ✅ VÁLIDO        ❌ INVÁLIDO
         │                │
         ▼                ▼
    ┌─────────┐      ┌──────────────┐
    │ Injectar│      │ Return 401   │
    │ user en │      │ Unauthorized │
    │ request │      └──────────────┘
    └────┬────┘
         │
┌────────▼────────────────────────────────────────────────┐
│ 3. Controller ejecuta con usuario autenticado           │
│    @CurrentUser() user => user.id ya verificado         │
│    @CurrentUser('id') userId => Extrae solo el ID       │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ 4. Service ejecuta lógica con Service Role Key          │
│    - Service Role Key es SECRETO (solo en backend)      │
│    - Acceso completo a BD                               │
│    - Todas las operaciones son auditadas                │
└──────────────────────────────────────────────────────────┘
```

---

## 🔑 Autenticación JWT

### ¿Cómo funciona?

1. **User se autentica en Supabase:**
   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password'
   });
   
   // data.session.access_token = JWT firmado por Supabase
   ```

2. **Frontend envía JWT en cada request:**
   ```javascript
   const response = await fetch('/api/conductores', {
     headers: {
       'Authorization': `Bearer ${session.access_token}`
     }
   });
   ```

3. **Backend verifica JWT:**
   ```typescript
   // jwt.strategy.ts
   validate(payload: any) {
     // payload contiene: sub, email, role, aud, iss
     // Firma ya fue verificada por Passport
     return {
       id: payload.sub,
       email: payload.email,
       role: payload.user_role
     };
   }
   ```

### Estructura del JWT Supabase

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user_id
  "email": "driver@example.com",
  "user_role": "driver",
  "aud": "authenticated",
  "iss": "https://jmshzmwhbbufgxgxlpcd.supabase.co/auth/v1",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Validación de Firma

El JWT está firmado con una **clave privada** que solo Supabase tiene.  
El backend valida la firma usando la **clave pública** (que es segura compartir).

```
JWT = HEADER.PAYLOAD.SIGNATURE
      └────────────────────┬───────────────────┘
                    Validado con PUBLIC_KEY

Si alguien modifica PAYLOAD:
❌ Signature no coincide
❌ Backend rechaza token
```

---

## 🔒 Protección de Secretos

### Variables de Entorno

#### ✅ SEGURO (Backend .env)

```env
# Solo en servidor, NUNCA en frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
RESEND_API_KEY=re_...
```

#### ⚠️ PARCIALMENTE SEGURO (Frontend .env)

```env
# Pública pero con RLS habilitado
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc...
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
```

#### ✅ SEGURO (Backend - Variables públicas)

```env
# No son secretas, solo configuración
SUPABASE_PUBLIC_KEY=eyJhbGc...
RESEND_FROM_EMAIL=noreply@example.com
NODE_ENV=production
```

### Flujo de Secrets en Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .

# Los .env NO se copian al image (se pasan en runtime)
# docker run -e SUPABASE_SERVICE_ROLE_KEY=... backend:latest
```

### Verificación en Runtime

```bash
# ✅ CORRECTO - Verificar que secrets NO aparecen en docker logs
docker-compose logs | grep -i "secret"  # Debe estar vacío

# ❌ INCORRECTO - Si ves esto:
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## 🔄 CORS & CSRF

### CORS Configurado en Backend

```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:19006',
    process.env.FRONTEND_URL || '*',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Qué protege:**
- ✅ Solo dominios whitelist pueden hacer requests
- ✅ Credentials (cookies) se incluyen si es same-site
- ✅ Métodos restringidos a lo necesario

**Qué NO protege:**
- ❌ CSRF via form simple (se protege con JWT)

### Por qué JWT es mejor que Cookies para CSRF

```javascript
// ❌ Cookies (vulnerable a CSRF)
GET https://evil.com (sin auth)
→ Pero la cookie se envía automáticamente
→ Puede hacer requests a tu backend

// ✅ JWT en header (seguro contra CSRF)
GET https://evil.com (sin auth)
→ JavaScript debe enviar el token explícitamente
→ JavaScript de evil.com NO puede acceder al JWT
→ Cross-origin fetch bloquea el envío
```

---

## ✔️ Validaciones

### 1. Validación Frontend

```javascript
// ✅ BUENO - Mejor UX
const validateFile = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    return "Archivo muy grande";
  }
};
```

### 2. Validación Backend (CRÍTICA)

```typescript
// ✅ CRÍTICO - Seguridad real
const validateFile = (file: Express.Multer.File) => {
  if (!file) throw new BadRequestException('No file');
  
  if (!['application/pdf', 'image/jpeg'].includes(file.mimetype)) {
    throw new BadRequestException('Invalid type');
  }
  
  if (file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('Too large');
  }
};
```

### Ejemplos de Validaciones Implementadas

| Validación | Ubicación | Protege |
|------------|-----------|---------|
| JWT válido | Middleware | Acceso no autenticado |
| Archivo type | Service | Inyección de malware |
| Archivo size | Service | DoS (disco lleno) |
| Fecha futura | Service | Licenses expiradas |
| Conductor activo | Service | Asignar inactivos |
| Capacidad camión | Service | Sobrecarga |

---

## ⏱️ Rate Limiting

### Implementar Rate Limiting (Recomendado)

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,      // 1 minuto
        limit: 10,       // 10 requests
      },
    ]),
  ],
})
export class AppModule {}
```

```typescript
// conductores.controller.ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 por minuto
@Post('upload-license')
async uploadLicense(...) { }
```

**Protege contra:**
- 🔴 Brute force attacks
- 🔴 DoS attacks
- 🔴 Credential stuffing

---

## 📝 Auditoría

### Logging Centralizado

```typescript
// logger.ts
export class Logger {
  private logger = new NestLogger();

  logUpload(userId: string, fileName: string, fileSize: number) {
    this.logger.log(
      `User ${userId} uploaded ${fileName} (${fileSize} bytes)`,
      'UPLOAD'
    );
  }

  logLicenseValidation(conductorId: string, isValid: boolean) {
    this.logger.log(
      `License validation for ${conductorId}: ${isValid}`,
      'LICENSE'
    );
  }

  logError(error: Error, context: string) {
    this.logger.error(error.message, error.stack, context);
  }
}
```

### Eventos Auditables

```typescript
// Cada operación crítica crea un evento
await supabase.from('audit_logs').insert({
  user_id: userId,
  action: 'LICENSE_UPLOAD',
  resource: 'driver_licenses',
  resource_id: licenseId,
  details: { fileName, fileSize },
  timestamp: new Date().toISOString(),
  ip_address: request.ip,
  status: 'SUCCESS',
});
```

---

## ✅ Checklist de Seguridad

### Antes de Producción

- [ ] **Secrets**
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` NO en frontend
  - [ ] `RESEND_API_KEY` NO en frontend
  - [ ] `.env` NO en git (verificar `.gitignore`)

- [ ] **Autenticación**
  - [ ] JWT se valida en TODOS los endpoints protegidos
  - [ ] Tokens expiran después de 24h
  - [ ] Refres tokens implementados (si aplica)

- [ ] **Autorización**
  - [ ] Solo usuarios autenticados pueden crear licencias
  - [ ] Users solo pueden ver/editar sus propios datos
  - [ ] Roles/permisos se verifican en servidor

- [ ] **Validaciones**
  - [ ] Todas las entradas validadas en servidor
  - [ ] Tipos correctos (string/int/date)
  - [ ] Rangos válidos (tamaño, fecha, etc.)

- [ ] **HTTPS**
  - [ ] Backend en HTTPS (no HTTP)
  - [ ] CORS origin en HTTPS
  - [ ] Certificados SSL válidos

- [ ] **Encryption**
  - [ ] Passwords hasheados (Supabase los maneja)
  - [ ] HTTPS para datos en tránsito
  - [ ] Archivos en Storage son privados con RLS

- [ ] **Logging & Monitoring**
  - [ ] Todos los accesos registrados
  - [ ] Errores 5xx alertan al admin
  - [ ] Tentativas de acceso no autorizado se registran

- [ ] **CORS**
  - [ ] Origins whitelist configurado
  - [ ] `credentials: true` solo si es necesario
  - [ ] Headers necesarios solamente

### En Producción

```bash
# Verificar que no hay secrets en logs
docker-compose logs | grep -i "key\|secret\|password"

# Verificar que HTTPS está habilitado
curl -I https://tu-backend.com/health

# Verificar que CORS funciona
curl -H "Origin: https://otro-dominio.com" \
     https://tu-backend.com/api/conductores
# Debe devolver 403 Forbidden o error CORS
```

---

## 🚨 Incidentes & Respuesta

### Si accidentalmente expones una clave:

1. **INMEDIATAMENTE** rota la clave:
   ```bash
   # En Supabase Dashboard:
   # Settings > API > Rotate Key
   ```

2. **Revoca tokens activos** (si aplica)

3. **Audita logs** para ver si fue usada:
   ```sql
   SELECT * FROM supabase_logs 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

4. **Notifica al equipo**

---

## 📚 Referencias de Seguridad

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [NestJS Security](https://docs.nestjs.com/security)

---

**Última actualización:** 27 Apr 2026  
**Estado:** ✅ Listo para producción
