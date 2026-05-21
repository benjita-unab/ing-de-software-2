-- Agrega columnas para cuantificación de bultos
-- 1) `bultos_despachados` en `rutas` (número enviado desde panel web al crear/editar ruta)
-- 2) `bultos_recepcionados` y `comentario_diferencia_bultos` en `entregas` (reportado al cerrar entrega)

ALTER TABLE IF EXISTS public.rutas
  ADD COLUMN IF NOT EXISTS bultos_despachados integer;

ALTER TABLE IF EXISTS public.entregas
  ADD COLUMN IF NOT EXISTS bultos_recepcionados integer;

ALTER TABLE IF EXISTS public.entregas
  ADD COLUMN IF NOT EXISTS comentario_diferencia_bultos text;

-- Opcional: ajustar permisos/índices según políticas del proyecto
