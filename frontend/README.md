# LogiTrack — Frontend web (React)

Portal del operador de sucursal (Create React App).

---

## Cómo correr localmente

```bash
cd frontend
npm install
npm start
```

Build de producción:

```bash
npm run build
```

---

## Variables de entorno

Crea `frontend/.env` (puedes partir de `.env.example`). Ejemplo con placeholders:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY
```

Solo las variables `REACT_APP_*` se inyectan en el bundle. **No** pongas claves de Supabase service role ni secretos de servidor aquí.

### Si pruebas contra el backend por Cloudflare Tunnel

Cuando el API está expuesto con `cloudflared` (ver README raíz), apunta el cliente al dominio `trycloudflare.com`:

```env
REACT_APP_API_URL=https://TU-TUNNEL.trycloudflare.com
REACT_APP_GOOGLE_MAPS_API_KEY=TU_API_KEY
```

Reinicia `npm start` tras cambiar `.env`.

---

## Cloudflare Tunnel (resumen)

El backend en tu máquina es `http://localhost:3000`. Para que **otro dispositivo** (por ejemplo un celular en otra red) use la misma API sin depender de tu IP local, suele usarse un túnel hacia ese puerto. La URL HTTPS que devuelve `cloudflared` puede usarse aquí como `REACT_APP_API_URL` si quieres probar el **navegador** contra ese mismo endpoint.

No es obligatorio para desarrollo solo en PC: con `REACT_APP_API_URL=http://localhost:3000` basta si el React y el Nest corren en la misma máquina.

Instrucciones completas: **README.md** en la raíz del repositorio (`../README.md`).

---

## Script opcional (semillas de datos)

Desde esta carpeta:

```bash
node scripts/seed_rutas.mjs
```

Requiere configuración válida en `src/lib/supabaseClient.js` o variables de entorno según el script.

---

## Troubleshooting

| Síntoma | Acción |
|---------|--------|
| El front no llama al API correcto | Verifica `REACT_APP_API_URL` y reinicia `npm start`. |
| **401** | Revisa que el token/sesión coincida con el backend (`JWT_SECRET`, login). Limpia almacenamiento del sitio en el navegador. |
| Cambié `.env` y no hay efecto | CRA solo lee env al arrancar; reinicia el servidor de desarrollo. |

Más casos (túnel 530, móvil): README raíz.
