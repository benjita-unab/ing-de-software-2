# Archivos para revisar manualmente

Estos elementos no se eliminaron automáticamente durante la reorganización del repo.

## Carpeta `.expo/` en la raíz

Si existe, suele ser caché local de Expo al abrir el proyecto desde la raíz. Puede borrarse en tu máquina; si está versionada por error, quitarla del índice de Git.

## `docs/guias/legacy/registro-viaje-root-temp.js`

Copia suelta que estaba en la raíz como `temp.js`. Parece una versión antigua del flujo de registro de viaje (sincronización directa con Supabase). La versión integrada en el proyecto está en `app-choferes-logistica/scripts/RegistroViaje.js` (usa `syncEngine`). Conservar este archivo solo como referencia o eliminarlo tras comparar.

## `docs/guias/update-email.js`

Script auxiliar que genera fragmentos de código para email; no forma parte del build. Mantener si el equipo lo usa como plantilla.

## `node_modules/` en la raíz

Tras mover el frontend a `frontend/`, si queda un `node_modules` antiguo en la raíz, puedes eliminarlo y volver a instalar solo dentro de `frontend/`, `backend/` y `app-choferes-logistica/`.
