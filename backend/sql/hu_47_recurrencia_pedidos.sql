-- =============================================================================
-- HU-47: Recurrencia de pedidos basados en rutas
-- =============================================================================
-- INSTRUCCIONES: ejecutar manualmente en Supabase SQL Editor.
-- PRE-REQUISITOS:
--   - Tablas public.rutas, public.rutas_plantilla, public.clientes, public.usuarios
--   - HU-58 (ruta_plantilla_id, rutas_paradas, observaciones en rutas)
--   - HU-60 recomendado (rutas_plantilla.cliente_id para adjudicación en UI)
-- =============================================================================
-- NOTA DE MODELO:
--   En LogiTrack el "pedido" operativo vive en public.rutas (no hay tabla pedidos).
--   Una recurrencia programa la generación automática de filas en public.rutas
--   copiando la configuración logística de una plantilla o de un pedido origen.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Tipos enumerados
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrencia_frecuencia') THEN
    CREATE TYPE public.recurrencia_frecuencia AS ENUM ('diaria', 'semanal', 'mensual');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrencia_estado') THEN
    CREATE TYPE public.recurrencia_estado AS ENUM ('activa', 'pausada', 'cancelada');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrencia_ejecucion_estado') THEN
    CREATE TYPE public.recurrencia_ejecucion_estado AS ENUM ('generada', 'fallida', 'omitida');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Adjudicación plantilla → cliente (HU-60; idempotente si ya aplicó HU-60)
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
  'Cliente B2B al que pertenece la plantilla. NULL = plantilla global legacy.';

-- -----------------------------------------------------------------------------
-- 3) Tabla principal de recurrencias (CA-01, CA-03, CA-05, CA-06)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurrencias_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dueño del pedido recurrente
  cliente_id uuid NOT NULL
    REFERENCES public.clientes (id)
    ON DELETE CASCADE,

  -- Origen de la configuración (al menos uno recomendado al crear)
  ruta_plantilla_id uuid NULL
    REFERENCES public.rutas_plantilla (id)
    ON DELETE SET NULL,
  ruta_origen_id uuid NULL
    REFERENCES public.rutas (id)
    ON DELETE SET NULL,

  -- Quién creó la recurrencia (operador o cliente — CA-05)
  creado_por_usuario_id uuid NULL
    REFERENCES public.usuarios (id)
    ON DELETE SET NULL,
  creado_por_rol text NOT NULL
    CHECK (creado_por_rol IN ('OPERADOR', 'ADMIN', 'CLIENTE')),

  -- Programación (CA-01)
  frecuencia public.recurrencia_frecuencia NOT NULL,
  intervalo integer NOT NULL DEFAULT 1
    CHECK (intervalo > 0),
  -- Semanal: 1=lunes … 7=domingo (ISO-8601). Mensual: 1–28 recomendado.
  dia_semana smallint NULL
    CHECK (dia_semana IS NULL OR dia_semana BETWEEN 1 AND 7),
  dia_mes smallint NULL
    CHECK (dia_mes IS NULL OR dia_mes BETWEEN 1 AND 31),
  hora_ejecucion time NOT NULL DEFAULT '08:00:00',
  zona_horaria text NOT NULL DEFAULT 'America/Santiago',

  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date NULL,
  proxima_ejecucion timestamptz NOT NULL,
  ultima_ejecucion timestamptz NULL,

  estado public.recurrencia_estado NOT NULL DEFAULT 'activa',

  -- Snapshot logístico congelado al crear/pausar/reanudar (CA-03)
  -- Estructura esperada por el backend:
  -- {
  --   "origen": "...",
  --   "destino": "...",
  --   "nombre_ruta": "...",
  --   "distancia_km": 120.5,
  --   "bultos_despachados": 10,
  --   "conductor_id": "uuid|null",
  --   "camion_id": "uuid|null",
  --   "observaciones": "...",
  --   "ruta_plantilla_id": "uuid|null",
  --   "paradas": [
  --     { "direccion": "...", "orden": 1, "latitud": null, "longitud": null, "es_temporal": false }
  --   ]
  -- }
  configuracion_logistica jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recurrencias_pedido_fechas_check
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),

  CONSTRAINT recurrencias_pedido_semanal_dia_check
    CHECK (
      frecuencia <> 'semanal'
      OR dia_semana IS NOT NULL
    ),

  CONSTRAINT recurrencias_pedido_mensual_dia_check
    CHECK (
      frecuencia <> 'mensual'
      OR dia_mes IS NOT NULL
    ),

  CONSTRAINT recurrencias_pedido_config_minima_check
    CHECK (
      ruta_plantilla_id IS NOT NULL
      OR ruta_origen_id IS NOT NULL
      OR (configuracion_logistica ? 'origen' AND configuracion_logistica ? 'destino')
    )
);

COMMENT ON TABLE public.recurrencias_pedido IS
  'HU-47: reglas de recurrencia que generan pedidos (rutas) automáticamente.';

COMMENT ON COLUMN public.recurrencias_pedido.configuracion_logistica IS
  'Snapshot JSON de origen, destino, paradas, bultos, conductor/camión y plantilla.';

COMMENT ON COLUMN public.recurrencias_pedido.proxima_ejecucion IS
  'Próxima fecha/hora UTC en que el CRON debe intentar generar el pedido (CA-07).';

-- Índices para CRON y listados por cliente
CREATE INDEX IF NOT EXISTS idx_recurrencias_pedido_cliente_id
  ON public.recurrencias_pedido (cliente_id);

CREATE INDEX IF NOT EXISTS idx_recurrencias_pedido_estado_proxima
  ON public.recurrencias_pedido (estado, proxima_ejecucion)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_recurrencias_pedido_plantilla_id
  ON public.recurrencias_pedido (ruta_plantilla_id)
  WHERE ruta_plantilla_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurrencias_pedido_ruta_origen_id
  ON public.recurrencias_pedido (ruta_origen_id)
  WHERE ruta_origen_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4) Historial de generaciones automáticas (CA-04)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurrencias_ejecuciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrencia_id uuid NOT NULL
    REFERENCES public.recurrencias_pedido (id)
    ON DELETE CASCADE,
  ruta_generada_id uuid NULL
    REFERENCES public.rutas (id)
    ON DELETE SET NULL,
  programada_para timestamptz NOT NULL,
  ejecutada_en timestamptz NOT NULL DEFAULT now(),
  estado public.recurrencia_ejecucion_estado NOT NULL DEFAULT 'generada',
  detalle_error text NULL,

  CONSTRAINT recurrencias_ejecuciones_programacion_unica
    UNIQUE (recurrencia_id, programada_para)
);

COMMENT ON TABLE public.recurrencias_ejecuciones IS
  'HU-47: auditoría de cada intento de generación automática de pedido.';

CREATE INDEX IF NOT EXISTS idx_recurrencias_ejecuciones_recurrencia_id
  ON public.recurrencias_ejecuciones (recurrencia_id, programada_para DESC);

CREATE INDEX IF NOT EXISTS idx_recurrencias_ejecuciones_ruta_generada_id
  ON public.recurrencias_ejecuciones (ruta_generada_id)
  WHERE ruta_generada_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5) Marcadores en rutas/pedidos para historial y trazabilidad (CA-02, CA-04)
-- -----------------------------------------------------------------------------
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS generado_automaticamente boolean NOT NULL DEFAULT false;

ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS recurrencia_id uuid NULL;

ALTER TABLE public.rutas
  DROP CONSTRAINT IF EXISTS rutas_recurrencia_id_fkey;

ALTER TABLE public.rutas
  ADD CONSTRAINT rutas_recurrencia_id_fkey
  FOREIGN KEY (recurrencia_id)
  REFERENCES public.recurrencias_pedido (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_generado_automaticamente
  ON public.rutas (generado_automaticamente)
  WHERE generado_automaticamente = true;

CREATE INDEX IF NOT EXISTS idx_rutas_recurrencia_id
  ON public.rutas (recurrencia_id)
  WHERE recurrencia_id IS NOT NULL;

COMMENT ON COLUMN public.rutas.generado_automaticamente IS
  'HU-47: true si el pedido fue creado por el job de recurrencia (filtro historial).';

COMMENT ON COLUMN public.rutas.recurrencia_id IS
  'HU-47: recurrencia que originó este pedido, si aplica.';

-- -----------------------------------------------------------------------------
-- 6) Trigger updated_at en recurrencias_pedido
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_recurrencias_pedido_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurrencias_pedido_updated_at ON public.recurrencias_pedido;

CREATE TRIGGER trg_recurrencias_pedido_updated_at
  BEFORE UPDATE ON public.recurrencias_pedido
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recurrencias_pedido_updated_at();

-- -----------------------------------------------------------------------------
-- 7) Vista auxiliar: próximos pedidos programados (CA-07)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_recurrencias_proximas AS
SELECT
  r.id AS recurrencia_id,
  r.cliente_id,
  c.nombre AS cliente_nombre,
  r.frecuencia,
  r.intervalo,
  r.dia_semana,
  r.dia_mes,
  r.hora_ejecucion,
  r.estado,
  r.proxima_ejecucion,
  r.ruta_plantilla_id,
  rp.nombre AS plantilla_nombre,
  r.ruta_origen_id,
  r.configuracion_logistica,
  r.fecha_inicio,
  r.fecha_fin
FROM public.recurrencias_pedido r
JOIN public.clientes c ON c.id = r.cliente_id
LEFT JOIN public.rutas_plantilla rp ON rp.id = r.ruta_plantilla_id
WHERE r.estado IN ('activa', 'pausada')
  AND (r.fecha_fin IS NULL OR r.fecha_fin >= CURRENT_DATE)
ORDER BY r.proxima_ejecucion ASC;

COMMENT ON VIEW public.v_recurrencias_proximas IS
  'HU-47: recurrencias con próxima ejecución visible para operador y portal cliente.';

COMMIT;

-- =============================================================================
-- 8) Validación post-migración (ejecutar manualmente, fuera de la transacción)
-- =============================================================================
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('recurrencias_pedido', 'recurrencias_ejecuciones');
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'rutas'
--   AND column_name IN ('generado_automaticamente', 'recurrencia_id');
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'rutas_plantilla'
--   AND column_name = 'cliente_id';
--
-- SELECT * FROM public.v_recurrencias_proximas LIMIT 5;
