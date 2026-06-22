-- =============================================================================
-- HU-60: Gestión de acceso clientes + plantillas por cliente
-- =============================================================================
-- INSTRUCCIONES: ejecutar manualmente en Supabase SQL Editor.
-- PRE-REQUISITOS: tablas public.usuarios, public.clientes, public.rutas_plantilla.
--                 Migración HU-27 aplicada (clientes.usuario_id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Unicidad de correo en usuarios (CA-03)
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unique_lower
  ON public.usuarios (lower(trim(email)));

-- -----------------------------------------------------------------------------
-- 2) Relación obligatoria cliente ↔ usuario (CA-05, CA-08)
--    IMPORTANTE: antes de NOT NULL, vincule o elimine clientes huérfanos.
-- -----------------------------------------------------------------------------
-- Ejemplo de backfill (ajuste según sus datos):
-- UPDATE public.clientes c
-- SET usuario_id = u.id
-- FROM public.usuarios u
-- WHERE lower(u.email) = lower(c.contacto_email)
--   AND u.rol = 'CLIENTE'
--   AND c.usuario_id IS NULL;

-- Descomente tras backfill:
-- ALTER TABLE public.clientes
--   ALTER COLUMN usuario_id SET NOT NULL;

-- Refuerzo FK: un usuario CLIENTE solo puede vincularse a un cliente
-- (índice único parcial ya existe en HU-27; se mantiene).

COMMENT ON COLUMN public.clientes.usuario_id IS
  'HU-60: usuario portal CLIENTE obligatorio (1:1). Credenciales en public.usuarios.';

-- -----------------------------------------------------------------------------
-- 3) Estado activo sincronizado (CA-07)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.clientes.activo IS
  'HU-60: acceso operativo del cliente; debe alinearse con usuarios.activo del portal.';

-- -----------------------------------------------------------------------------
-- 4) Plantillas de ruta adjudicadas a cliente (recurrencias / HU-60)
-- -----------------------------------------------------------------------------
ALTER TABLE public.rutas_plantilla
  ADD COLUMN IF NOT EXISTS cliente_id uuid NULL;

ALTER TABLE public.rutas_plantilla
  DROP CONSTRAINT IF EXISTS rutas_plantilla_cliente_id_fkey;

ALTER TABLE public.rutas_plantilla
  ADD CONSTRAINT rutas_plantilla_cliente_id_fkey
  FOREIGN KEY (cliente_id)
  REFERENCES public.clientes (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS idx_rutas_plantilla_cliente_id
  ON public.rutas_plantilla (cliente_id)
  WHERE cliente_id IS NOT NULL;

COMMENT ON COLUMN public.rutas_plantilla.cliente_id IS
  'HU-60: cliente B2B al que pertenece la plantilla. NULL = plantilla global legacy.';

-- -----------------------------------------------------------------------------
-- 5) Recuperación de contraseña portal cliente (CA-06)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_usuario_id
  ON public.password_reset_tokens (usuario_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON public.password_reset_tokens (expires_at);

COMMENT ON TABLE public.password_reset_tokens IS
  'HU-60: tokens de un solo uso para restablecer contraseña del portal cliente.';

-- -----------------------------------------------------------------------------
-- 6) Validación post-migración (ejecutar manualmente)
-- -----------------------------------------------------------------------------
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'rutas_plantilla' AND column_name = 'cliente_id';
--
-- SELECT id, nombre, usuario_id, activo FROM public.clientes WHERE usuario_id IS NULL;
