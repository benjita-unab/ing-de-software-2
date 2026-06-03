-- =============================================================================
-- HU-27: Portal Cliente — ROLLBACK del modelo de datos
-- =============================================================================
-- ADVERTENCIA:
--   - PostgreSQL no permite eliminar valores de un enum de forma trivial.
--     Tras el rollback, el valor 'CLIENTE' puede seguir existiendo en user_role.
--   - Ejecutar solo si necesitas revertir columna, FK, índices y usuario demo.
--
-- INSTRUCCIONES
-- -------------
-- 1. Ejecutar en SQL Editor (Supabase) en un entorno de desarrollo/staging.
-- 2. Verificar que ningún otro cliente dependa de usuario_id antes de DROP.
-- 3. Re-aplicar con hu_27_portal_cliente.sql si necesitas restaurar.
-- =============================================================================

-- Desvincular y eliminar usuario de prueba
UPDATE public.clientes
SET usuario_id = NULL
WHERE usuario_id IN (
  SELECT id FROM public.usuarios WHERE email = 'portal.cliente@logitrack.cl'
);

DELETE FROM public.usuarios
WHERE email = 'portal.cliente@logitrack.cl';

-- Índice de rutas (puede usarse por operador; opcional mantenerlo)
DROP INDEX IF EXISTS public.idx_rutas_cliente_id;

DROP INDEX IF EXISTS public.idx_clientes_usuario_id;
DROP INDEX IF EXISTS public.clientes_usuario_id_unique;

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_usuario_id_fkey;

ALTER TABLE public.clientes
  DROP COLUMN IF EXISTS usuario_id;

-- El valor enum 'CLIENTE' permanece en public.user_role (limitación de PostgreSQL).
