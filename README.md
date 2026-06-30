# LogiTrack

Sistema de logística para gestión de rutas, entregas, evidencias fotográficas, códigos QR, firmas y documentos PDF: portal web (React), app para choferes (Expo) y API NestJS sobre Supabase (PostgreSQL y Storage).

## Estructura del repositorio

| Ruta | Contenido |
|------|-----------|
| `backend/` | API NestJS |
| `frontend/` | Portal web React (Create React App) |
| `app-choferes-logistica/` | App móvil Expo |
| `docs/` | Arquitectura, guías y entregables |
| `docker-compose.yml` | Backend en contenedor + proxy Nginx |
| `nginx.conf` | Reverse proxy hacia el servicio `backend` |

---

## Cómo correr localmente

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

La API escucha en `http://localhost:3000` (puerto configurable con `PORT` en `backend/.env`).

### Frontend web (React)

```bash
cd frontend
npm install
npm start
```

### App móvil (Expo)

```bash
cd app-choferes-logistica
npm install
npx expo start -c
```

---

## Variables de entorno (placeholders)

No copies secretos reales al README ni a Git. Usa valores locales en cada `.env`.

### `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY
```

Si pruebas el **frontend contra el backend expuesto con Cloudflare**:

```env
REACT_APP_API_URL=https://TU-TUNNEL.trycloudflare.com
REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY
```

### `app-choferes-logistica/.env`

```env
EXPO_PUBLIC_API_URL=https://TU-TUNNEL.trycloudflare.com
EXPO_PUBLIC_DEBUG_EMAIL=conductor1@sistema.cl
EXPO_PUBLIC_DEBUG_PASSWORD=hash456
EXPO_PUBLIC_RUTA_ID=UUID_DE_RUTA_DE_PRUEBA
```

### `backend/.env`

```env
PORT=3000
JWT_SECRET=super_secret_key_123456
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
RESEND_API_KEY=re_tu_clave_resend
```

Plantillas: `frontend/.env.example`, `app-choferes-logistica/.env.example`, `backend/.env.example`.

---

## Probar desde celular con Cloudflare Tunnel

- El backend en tu PC corre en **`http://localhost:3000`**.
- El celular **no** puede usar `localhost` de tu PC.
- A veces la IP de la red local funciona, pero firewalls o redes separadas la impiden; lo más fiable para pruebas es **exponer solo el backend** con `cloudflared`.

### Pasos

1. Instala [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (`cloudflared`).
2. Levanta el backend: `cd backend && npm run start:dev`.
3. En otra terminal, expón el puerto del API:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. Copia la URL que muestra el comando, del estilo:

   `https://xxxxx.trycloudflare.com`

5. Pégala en **`app-choferes-logistica/.env`**:

   `EXPO_PUBLIC_API_URL=https://xxxxx.trycloudflare.com`

   Opcional: si quieres que el **frontend web** también hable con el API por el túnel, pon la misma URL en **`frontend/.env`** como `REACT_APP_API_URL`.

6. Reinicia Expo con caché limpia:

   ```bash
   cd app-choferes-logistica
   npx expo start -c
   ```

El backend ya incluye CORS para `https://*.trycloudflare.com`.

**Importante:** si `npx expo start --tunnel` (ngrok/Expo) te falla, no es obligatorio para este flujo. **Cloudflare solo expone el backend**; la app móvil debe apuntar a esa URL con `EXPO_PUBLIC_API_URL`, no hace falta túnel de Expo para el API.

---

## Docker (stack completo)

### Requisitos previos

1. Copia `.env.example` a `.env` en la **raíz** del repositorio.
2. Copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env`.
3. Completa al menos `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `JWT_SECRET`.

### Producción (build estático + API)

```bash
docker compose -f docker-compose.yml up --build -d
```

| Servicio   | URL / puerto host        |
|------------|--------------------------|
| Backend    | http://localhost:3000    |
| Frontend   | http://localhost:3001    |
| Nginx API  | http://localhost:8080    |
| Mosquitto  | `1883` (TCP), `9001` (WS)|

### Desarrollo (hot-reload; usa `docker-compose.override.yml` automáticamente)

```bash
docker compose up --build
```

Detener: `docker compose down`  
Reconstruir imágenes: `docker compose build --no-cache`  
Solo backend (aislado): `cd backend && docker compose up --build`

La base de datos es **Supabase Cloud** (no hay contenedor PostgreSQL). MQTT local corre en Mosquitto.

---

## Flujo funcional (resumen)

1. Rutas y asignación  
2. Evidencias y trazabilidad  
3. QR y validación de entrega  
4. Firma y cierre de despacho  
5. PDF e historial  

Más detalle: `docs/guias/guia_endpoints_logitrack.md` y `docs/arquitectura/ARQUITECTURA_BACKEND.md`.

---

## Documentación

Índice: `docs/INDICE_MAESTRO.md`. Guías en `docs/guias/`, arquitectura en `docs/arquitectura/`, entregables en `docs/entregables/`.

Archivos a revisar manualmente: `docs/REVISAR_MANUALMENTE.md`.

---

## Troubleshooting

| Problema | Qué hacer |
|----------|-----------|
| **Network request failed** (móvil) | Revisa `EXPO_PUBLIC_API_URL` (HTTPS del túnel, sin barra final incorrecta). Confirma que el backend sigue en marcha y que la URL del túnel es la actual. |
| **HTTP 530** | Túnel caído o URL vieja: vuelve a ejecutar `cloudflared tunnel --url http://localhost:3000` y actualiza `.env` con la nueva URL. |
| **401 Unauthorized** | Usuario debe existir en `public.usuarios` (`activo=true`); alinea credenciales en cliente con la tabla; revisa `JWT_SECRET`. Limpia tokens viejos en `localStorage` / AsyncStorage. |
| **Cambié `.env` y no pasa nada** | Reinicia backend, frontend (`npm start`) y Expo (`npx expo start -c`). CRA y Expo leen variables al arrancar. |
| **La app sigue usando IP o URL vieja** | `npx expo start -c`; si usas Expo Go, borra caché o datos de la app si hace falta. |

README específicos: `frontend/README.md`, `app-choferes-logistica/README.md`, `backend/README.md`.
