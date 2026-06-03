-- =============================================================================
-- HU-27: Portal Cliente — modelo de datos
-- =============================================================================
-- Objetivos:
--   1. Rol CLIENTE en enum user_role
--   2. clientes.usuario_id → usuarios.id (1 usuario : 0..1 cliente)
--   3. Índices para login portal y listado de pedidos por cliente
--   4. Usuario de prueba vinculado a "Empresa Demo"
--
-- INSTRUCCIONES DE EJECUCIÓN
-- -------------------------
-- Opción A — Supabase Dashboard: SQL Editor → pegar este archivo → Run
-- Opción B — Supabase CLI (remoto): supabase db push (si está en migrations/)
-- Opción C — MCP / CI: apply_migration con nombre hu_27_portal_cliente
--
-- PRE-REQUISITOS: tablas public.usuarios y public.clientes existentes.
-- POST-VALIDACIÓN: ejecutar consultas al final de este archivo o
--   backend/sql/hu_27_portal_cliente_validate.sql
--
-- ROLLBACK: backend/sql/hu_27_portal_cliente_rollback.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Enum user_role: valor CLIENTE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'CLIENTE'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'CLIENTE';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Columna usuario_id en clientes
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- -----------------------------------------------------------------------------
-- 3) Foreign key → usuarios.id
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS clientes_usuario_id_fkey;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_usuario_id_fkey
  FOREIGN KEY (usuario_id)
  REFERENCES public.usuarios (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- -----------------------------------------------------------------------------
-- 4) Índices
-- -----------------------------------------------------------------------------
-- Un usuario de portal solo puede representar un cliente B2B
CREATE UNIQUE INDEX IF NOT EXISTS clientes_usuario_id_unique
  ON public.clientes (usuario_id)
  WHERE usuario_id IS NOT NULL;

-- Resolver cliente desde JWT (usuarios.id → clientes.id)
CREATE INDEX IF NOT EXISTS idx_clientes_usuario_id
  ON public.clientes (usuario_id);

-- Listar pedidos (rutas) por cliente en portal
CREATE INDEX IF NOT EXISTS idx_rutas_cliente_id
  ON public.rutas (cliente_id);

COMMENT ON COLUMN public.clientes.usuario_id IS
  'Usuario con rol CLIENTE autorizado a ver pedidos (rutas) de este cliente en HU-27 Portal.';

-- -----------------------------------------------------------------------------
-- 5) Usuario cliente de prueba + vínculo con Empresa Demo
-- -----------------------------------------------------------------------------
INSERT INTO public.usuarios (email, password, nombre, rol, activo)
VALUES (
  'portal.cliente@logitrack.cl',
  'cliente123',
  'Portal Cliente Demo',
  'CLIENTE',
  true
)
ON CONFLICT (email) DO UPDATE
SET
  password = EXCLUDED.password,
  nombre = EXCLUDED.nombre,
  rol = 'CLIENTE',
  activo = true;

UPDATE public.clientes c
SET usuario_id = u.id
FROM public.usuarios u
WHERE u.email = 'portal.cliente@logitrack.cl'
  AND c.id = '99426706-6706-44aa-9954-3617b583bb0d'
  AND c.usuario_id IS NULL;

-- Si Empresa Demo ya tuviera otro usuario_id, no sobrescribir (seguridad manual)
