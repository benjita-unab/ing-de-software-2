# LogiTrack — Backend (NestJS)

API REST para el portal web y la app móvil. Datos y archivos vía Supabase.

---

## Cómo correr localmente

```bash
cd backend
npm install
npm run start:dev
```

Por defecto el servidor usa el puerto **3000** (definible con `PORT` en `.env`).

Otras tareas:

```bash
npm run build        # compilación
npm run start:prod   # ejecutar dist compilado (tras build)
```

---

## Variables de entorno

Crea `backend/.env` a partir de `.env.example`. Ejemplo con **placeholders** (sustituye en local; no subas `.env` a Git):

```env
PORT=3000
DEBUG_EMAIL=test@test.com
DEBUG_PASSWORD=123456
JWT_SECRET=super_secret_key_123456
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
RESEND_API_KEY=re_tu_clave_resend
```

- `DEBUG_EMAIL` / `DEBUG_PASSWORD`: credenciales que el flujo de login de desarrollo valida contra el servidor.
- `JWT_SECRET`: debe coincidir con lo que espera la validación de tokens emitidos por este backend.
- `SUPABASE_*` y `RESEND_*`: secretos solo en el servidor; nunca en el frontend ni en la app móvil.

---

## App móvil y Cloudflare Tunnel

Este servicio escucha en **`http://localhost:3000`** en tu máquina. Los celulares no ven ese `localhost`.

Para pruebas desde el teléfono suele usarse un túnel HTTPS hacia este puerto, por ejemplo:

```bash
cloudflared tunnel --url http://localhost:3000
```

La URL `https://xxxxx.trycloudflare.com` que imprime el comando debe configurarse en **la app Expo** como `EXPO_PUBLIC_API_URL`, no aquí. Detalle paso a paso: **README.md en la raíz del repositorio** y `app-choferes-logistica/README.md`.

---

## Documentación técnica

- `../docs/arquitectura/ARQUITECTURA_BACKEND.md`
- `../docs/guias/guia_endpoints_logitrack.md`

---

## Troubleshooting (backend)

| Síntoma | Acción |
|---------|--------|
| **401** en clientes | Revisa `DEBUG_EMAIL`, `DEBUG_PASSWORD`, `JWT_SECRET`; los clientes deben usar el mismo esquema de auth que este servicio. |
| Cliente no llega desde el móvil | El problema suele ser red o URL en el cliente; expón este puerto con `cloudflared` y actualiza `EXPO_PUBLIC_API_URL` en la app. |
| Cambié `.env` y sigue igual | Reinicia `npm run start:dev`; Nest carga variables al arrancar. |

Casos de túnel 530 o “network failed” en el móvil: ver tabla en el README raíz.
