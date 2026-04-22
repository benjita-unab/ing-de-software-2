# LogiTrack - Migración BaaS a Backend Next.js

## 1) Descripción
Se reemplazó la lógica backend de Supabase cliente por un backend propio en `Next.js` (`backend-next`), manteniendo Supabase como:
- Base de datos PostgreSQL.
- Storage para archivos.

El frontend web y la app móvil ahora consumen endpoints REST propios (`/api/*`) y dejan de depender de `supabase.auth.getSession()`.

## 2) Arquitectura objetivo
- `backend-next` (Next.js App Router + API routes)
- Supabase:
  - Auth solo para emisión de token en login (`signInWithPassword` desde backend).
  - PostgreSQL para datos.
  - Storage para evidencias/firma.
- Cliente/admin Supabase con `SUPABASE_SERVICE_ROLE_KEY` solo en backend.

Estructura principal:
- `backend-next/app/api/auth/login/route.ts`
- `backend-next/app/api/email/enviar-qr/route.ts`
- `backend-next/app/api/storage/upload/route.ts`
- `backend-next/app/api/trazabilidad/route.ts`
- `backend-next/app/api/dispatch/close/route.ts`
- `backend-next/app/api/routes/[id]/route.ts`
- `backend-next/app/api/entregas/route.ts`
- `backend-next/middleware.ts`
- `backend-next/lib/supabase.ts`
- `backend-next/lib/auth.ts`

## 3) Flujo de autenticación
1. Cliente llama `POST /api/auth/login` con email/password.
2. Backend ejecuta `supabase.auth.signInWithPassword`.
3. Backend consulta `usuarios` por `id = auth.user.id` para obtener perfil extendido.
4. Backend devuelve JWT (`accessToken`) + `perfil`.
5. Cliente guarda token y envía `Authorization: Bearer <token>`.
6. `middleware.ts` valida JWT con `SUPABASE_JWT_SECRET`.

Nota: la columna `password` de `usuarios` no se usa para autenticación.

## 4) Endpoints documentados

### `POST /api/auth/login` (público)
Request:
```json
{ "email": "operador@empresa.cl", "password": "123456" }
```
Response:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 3600,
  "tokenType": "bearer",
  "user": { "id": "uuid" }
}
```

### `POST /api/email/enviar-qr` (protegido)
Request:
```json
{ "email": "cliente@correo.com", "clienteId": "cli-001", "nombreCliente": "Cliente Uno" }
```
Response:
```json
{ "ok": true, "provider": { "id": "resend-id" } }
```

### `POST /api/storage/upload` (protegido)
`multipart/form-data`:
- `file`
- `bucket` (opcional, default `fotos_trazabilidad`)
- `folder` (opcional, default `uploads`)

Response:
```json
{
  "bucket": "fotos_trazabilidad",
  "filePath": "firmas/1711111_firma.png",
  "publicUrl": "https://...supabase.co/storage/v1/object/public/..."
}
```

### `POST /api/trazabilidad` (protegido)
Inserta en `traceability_events`.

### `POST /api/dispatch/close` (protegido)
Valida entregas por `rutaId`, marca `validado=true` y opcionalmente envía email de cierre.

### `GET /api/routes/:id` (protegido)
Devuelve ruta + cliente + entregas.

### `POST /api/entregas` (protegido)
Crea entrega con OTP.

## 5) Variables de entorno
Usar `.env` basado en `.env.example`:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_API_URL=
REACT_APP_API_URL=
EXPO_PUBLIC_API_URL=
```

## 6) Cómo correr

### Local backend
```bash
cd backend-next
npm install
npm run dev
```
API en `http://localhost:3000/api`.

### Local web
```bash
npm install
npm start
```
Configurar `REACT_APP_API_URL=http://localhost:3000`.

### Local móvil (Expo)
En `app-choferes-logistica/.env`:
```env
EXPO_PUBLIC_API_URL=http://<IP-PC>:3000
```
Luego:
```bash
cd app-choferes-logistica
npm install
npx expo start -c
```

## 7) Docker
Levanta backend y proxy nginx:
```bash
docker compose up --build
```

Servicios:
- `backend-next` en `3000`.
- `nginx` reverse proxy en `8080`.

## 8) Despliegue en servidor universitario
1. Instalar Docker + Docker Compose.
2. Copiar repo y crear `.env` con claves reales.
3. Ejecutar `docker compose up -d --build`.
4. Abrir puertos `3000` (backend directo) o `8080` (nginx).
5. Configurar app móvil con `EXPO_PUBLIC_API_URL=http://<IP_SERVIDOR>:3000`.

## 9) Troubleshooting

### Network request failed
- Verificar IP/puerto accesible desde celular.
- Confirmar `EXPO_PUBLIC_API_URL` sin slash final.
- Revisar firewall en PC/servidor.

### JWT inválido
- Revisar `SUPABASE_JWT_SECRET` del proyecto Supabase correcto.
- Confirmar que el token enviado sea `accessToken` vigente.
- Revisar header `Authorization: Bearer ...`.

### CORS
- Backend responde `Access-Control-Allow-*`.
- Verificar que requests `OPTIONS` no estén bloqueadas por proxy/firewall.

## 10) Cambios realizados en frontend
- App móvil:
  - Nuevo `src/services/bffService.ts` (cliente API + token).
  - Nuevo `src/services/syncEngine.ts` (sincronización trazabilidad por API).
  - `cierreDespachoService.ts` migrado a endpoints backend.
  - `entregasService.ts` migrado a endpoint backend.
  - `scripts/RegistroViaje.js` migrado a `syncEngine`.
- Web:
  - `src/hooks/useAuth.js` ahora usa `POST /api/auth/login` y token local en vez de `getSession()`.

