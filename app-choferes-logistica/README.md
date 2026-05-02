# LogiTrack — App choferes (Expo)

Aplicación móvil para conductores: trazabilidad, entregas, QR y cierre de despacho contra el backend LogiTrack.

---

## Cómo correr localmente

```bash
cd app-choferes-logistica
npm install
npx expo start -c
```

El flag `-c` limpia la caché de Metro; útil cuando cambias URLs o variables de entorno.

---

## Variables de entorno

Crea `app-choferes-logistica/.env` (plantilla: `.env.example`). Ejemplo con **placeholders** (no uses secretos reales en el repo):

```env
EXPO_PUBLIC_API_URL=https://TU-TUNNEL.trycloudflare.com
EXPO_PUBLIC_DEBUG_EMAIL=test@test.com
EXPO_PUBLIC_DEBUG_PASSWORD=123456
EXPO_PUBLIC_RUTA_ID=UUID_DE_RUTA_DE_PRUEBA
```

- `EXPO_PUBLIC_API_URL`: URL base del **backend** NestJS (en LAN con `http://TU_IP:3000`, o HTTPS del túnel).
- Las variables `EXPO_PUBLIC_*` se incrustan en el bundle; reinicia Expo tras cualquier cambio.

---

## Probar desde celular con Cloudflare Tunnel

1. El backend en tu PC escucha en **`http://localhost:3000`**.
2. Un celular **no** puede abrir `localhost` de tu ordenador.
3. Opciones: IP en la misma Wi‑Fi (a veces bloqueada por firewall) o **exponer el backend** con Cloudflare.

### Comando típico

Con el backend ya en marcha (`cd backend && npm run start:dev`), en otra terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copia la URL generada, por ejemplo:

`https://xxxxx.trycloudflare.com`

Pégala en este archivo como:

```env
EXPO_PUBLIC_API_URL=https://xxxxx.trycloudflare.com
```

Guarda, y reinicia la app de desarrollo:

```bash
npx expo start -c
```

### Sobre `npx expo start --tunnel`

Si **ngrok** o el túnel de Expo fallan, **no es requisito** para probar el API. Aquí el túnel de **Cloudflare expone el backend**; la app solo necesita `EXPO_PUBLIC_API_URL` correcta. No confundas el túnel de Expo con el de `cloudflared` hacia el puerto 3000.

Opcional: el mismo dominio `trycloudflare.com` puede usarse en `frontend/.env` como `REACT_APP_API_URL` si quieres probar también el portal web contra ese endpoint (ver README raíz).

---

## Documentación

- Repositorio (arquitectura, Docker, troubleshooting general): `../README.md`
- Endpoints: `../docs/guias/guia_endpoints_logitrack.md`

---

## Troubleshooting

| Problema | Qué revisar |
|----------|-------------|
| **Network request failed** | `EXPO_PUBLIC_API_URL` (HTTPS, URL actual del túnel, backend encendido). |
| **HTTP 530** | Túnel cerrado o URL antigua; genera otra URL con `cloudflared` y actualiza `.env`. |
| **401 Unauthorized** | Misma pareja `DEBUG_EMAIL` / `DEBUG_PASSWORD` que en `backend/.env`; `JWT_SECRET` coherente; borra sesión/token en la app si aplica. |
| Cambié `.env` y no pasa nada | `npx expo start -c`; las variables se leen al empaquetar. |
| Sigue usando IP o URL vieja | Limpia caché con `-c`; en Expo Go, borra datos de la app si hace falta. |
