-- =============================================================================
-- HU-50: Rendimiento y costos operativos por pedido/ruta
-- =============================================================================
-- INSTRUCCIONES: ejecutar manualmente en Supabase SQL Editor.
-- PRE-REQUISITOS:
--   - public.camiones, public.rutas, public.configuracion_pagos (HU-37)
--   - Pedido operativo = fila en public.rutas (HU-58)
-- =============================================================================
-- DECISIÓN DE DISEÑO (CA-04):
--   Tabla dedicada `costos_operativos_ruta` (1:1 con rutas) en lugar de columnas
--   sueltas en `rutas`. Guarda una "fotografía" con tarifas y rendimiento usados
--   al momento del cálculo/congelado. Un trigger impide modificar filas congeladas.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Rendimiento obligatorio en camiones (CA-02)
-- -----------------------------------------------------------------------------
ALTER TABLE public.camiones
  ADD COLUMN IF NOT EXISTS km_l numeric(8, 2) NULL;

COMMENT ON COLUMN public.camiones.km_l IS
  'HU-50: rendimiento del camión en kilómetros por litro (Km/L). Obligatorio para nuevos registros.';

-- IMPORTANTE: ejecute backfill antes de aplicar NOT NULL en camiones existentes.
-- Ajuste el valor default según su flota (ejemplo: 8.0 km/L).
-- UPDATE public.camiones SET km_l = 8.0 WHERE km_l IS NULL;

-- Descomente tras backfill:
-- ALTER TABLE public.camiones
--   ALTER COLUMN km_l SET NOT NULL;

ALTER TABLE public.camiones
  DROP CONSTRAINT IF EXISTS camiones_km_l_positive;

ALTER TABLE public.camiones
  ADD CONSTRAINT camiones_km_l_positive
  CHECK (km_l IS NULL OR km_l > 0);

CREATE INDEX IF NOT EXISTS idx_camiones_km_l
  ON public.camiones (km_l)
  WHERE km_l IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) Configuración global: precio combustible + tarifa espera (reutiliza HU-37)
-- -----------------------------------------------------------------------------
ALTER TABLE public.configuracion_pagos
  ADD COLUMN IF NOT EXISTS precio_combustible_litro numeric(12, 2) NOT NULL DEFAULT 1200;

ALTER TABLE public.configuracion_pagos
  ADD COLUMN IF NOT EXISTS precio_espera_minuto numeric(12, 2) NOT NULL DEFAULT 500;

ALTER TABLE public.configuracion_pagos
  DROP CONSTRAINT IF EXISTS configuracion_pagos_precio_combustible_nonneg;

ALTER TABLE public.configuracion_pagos
  ADD CONSTRAINT configuracion_pagos_precio_combustible_nonneg
  CHECK (precio_combustible_litro >= 0);

ALTER TABLE public.configuracion_pagos
  DROP CONSTRAINT IF EXISTS configuracion_pagos_precio_espera_nonneg;

ALTER TABLE public.configuracion_pagos
  ADD CONSTRAINT configuracion_pagos_precio_espera_nonneg
  CHECK (precio_espera_minuto >= 0);

COMMENT ON COLUMN public.configuracion_pagos.precio_combustible_litro IS
  'HU-50: precio global del combustible (CLP/litro) para cálculo de costos operativos.';

COMMENT ON COLUMN public.configuracion_pagos.precio_espera_minuto IS
  'HU-50: tarifa global por minuto de espera operativa (CLP/min).';

-- Valores iniciales en el singleton existente (idempotente)
UPDATE public.configuracion_pagos
SET
  precio_combustible_litro = COALESCE(precio_combustible_litro, 1200),
  precio_espera_minuto = COALESCE(precio_espera_minuto, 500)
WHERE singleton_key = 'default';

-- -----------------------------------------------------------------------------
-- 3) Estado del costo operativo
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'costo_operativo_estado') THEN
    CREATE TYPE public.costo_operativo_estado AS ENUM ('borrador', 'congelado');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Fotografía de costos por pedido/ruta (CA-01, CA-03, CA-04)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.costos_operativos_ruta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ruta_id uuid NOT NULL
    REFERENCES public.rutas (id)
    ON DELETE CASCADE,

  estado public.costo_operativo_estado NOT NULL DEFAULT 'borrador',

  -- Referencias al momento del cálculo (trazabilidad)
  camion_id uuid NULL REFERENCES public.camiones (id) ON DELETE SET NULL,
  conductor_id uuid NULL REFERENCES public.conductores (id) ON DELETE SET NULL,

  -- Distancia y combustible (CA-01, CA-03)
  distancia_km numeric(10, 2) NOT NULL DEFAULT 0,
  km_l_camion numeric(8, 2) NOT NULL,
  km_l_override numeric(8, 2) NULL,
  km_l_aplicado numeric(8, 2) NOT NULL,
  consumo_litros_estimado numeric(10, 2) NOT NULL DEFAULT 0,
  precio_combustible_litro numeric(12, 2) NOT NULL,
  costo_combustible numeric(14, 2) NOT NULL DEFAULT 0,

  -- Conductor (HU-37 congelado al guardar)
  costo_conductor numeric(14, 2) NOT NULL DEFAULT 0,
  tarifas_conductor jsonb NOT NULL DEFAULT '{}'::jsonb,
  desglose_conductor jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Espera y peajes (CA-01)
  tiempo_espera_minutos integer NOT NULL DEFAULT 0,
  precio_espera_minuto numeric(12, 2) NOT NULL DEFAULT 0,
  costo_espera numeric(14, 2) NOT NULL DEFAULT 0,
  costo_peajes numeric(14, 2) NOT NULL DEFAULT 0,

  costo_total numeric(14, 2) NOT NULL DEFAULT 0,

  congelado_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES public.usuarios (id) ON DELETE SET NULL,

  CONSTRAINT costos_operativos_ruta_ruta_id_unique UNIQUE (ruta_id),

  CONSTRAINT costos_operativos_km_l_aplicado_positive
    CHECK (km_l_aplicado > 0),

  CONSTRAINT costos_operativos_consumo_nonneg
    CHECK (consumo_litros_estimado >= 0),

  CONSTRAINT costos_operativos_importes_nonneg
    CHECK (
      distancia_km >= 0
      AND costo_combustible >= 0
      AND costo_conductor >= 0
      AND costo_espera >= 0
      AND costo_peajes >= 0
      AND costo_total >= 0
      AND tiempo_espera_minutos >= 0
    ),

  CONSTRAINT costos_operativos_congelado_coherente
    CHECK (
      (estado = 'congelado' AND congelado_at IS NOT NULL)
      OR (estado = 'borrador')
    )
);

COMMENT ON TABLE public.costos_operativos_ruta IS
  'HU-50: desglose de costos operativos por pedido/ruta. Una fila por ruta; congelada al finalizar.';

COMMENT ON COLUMN public.costos_operativos_ruta.km_l_override IS
  'HU-50 CA-03: rendimiento manual para este viaje. Si NULL, se usa km_l_camion.';

COMMENT ON COLUMN public.costos_operativos_ruta.km_l_aplicado IS
  'COALESCE(km_l_override, km_l_camion) al momento del último cálculo/guardado.';

COMMENT ON COLUMN public.costos_operativos_ruta.precio_combustible_litro IS
  'Precio del litro congelado en el cálculo (CA-04). No se recalcula si cambia configuracion_pagos.';

COMMENT ON COLUMN public.costos_operativos_ruta.tarifas_conductor IS
  'Snapshot JSON de tarifas HU-37 usadas: precioPorRuta, precioPorEntrega, precioPorBulto, precioPorKm.';

COMMENT ON COLUMN public.costos_operativos_ruta.desglose_conductor IS
  'Snapshot JSON del desglose HU-37 para esta ruta (montos por concepto).';

COMMENT ON COLUMN public.costos_operativos_ruta.congelado_at IS
  'HU-50 CA-04: timestamp de inmutabilidad. Tras congelar, la fila no debe modificarse.';

CREATE INDEX IF NOT EXISTS idx_costos_operativos_ruta_ruta_id
  ON public.costos_operativos_ruta (ruta_id);

CREATE INDEX IF NOT EXISTS idx_costos_operativos_ruta_estado
  ON public.costos_operativos_ruta (estado);

CREATE INDEX IF NOT EXISTS idx_costos_operativos_ruta_congelado_at
  ON public.costos_operativos_ruta (congelado_at DESC)
  WHERE congelado_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5) Trigger updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_costos_operativos_ruta_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_costos_operativos_ruta_updated_at ON public.costos_operativos_ruta;

CREATE TRIGGER trg_costos_operativos_ruta_updated_at
  BEFORE UPDATE ON public.costos_operativos_ruta
  FOR EACH ROW
  EXECUTE FUNCTION public.set_costos_operativos_ruta_updated_at();

-- -----------------------------------------------------------------------------
-- 6) Trigger inmutabilidad (CA-04)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_costos_operativos_update_when_frozen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.estado = 'congelado' AND OLD.congelado_at IS NOT NULL THEN
    RAISE EXCEPTION
      'HU-50 CA-04: los costos operativos de la ruta % están congelados y no pueden modificarse.',
      OLD.ruta_id;
  END IF;

  -- No permitir "descongelar"
  IF OLD.estado = 'congelado' AND NEW.estado = 'borrador' THEN
    RAISE EXCEPTION
      'HU-50 CA-04: no se puede revertir un costo operativo congelado a borrador.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_costos_operativos_immutable ON public.costos_operativos_ruta;

CREATE TRIGGER trg_costos_operativos_immutable
  BEFORE UPDATE ON public.costos_operativos_ruta
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_costos_operativos_update_when_frozen();

COMMIT;

-- =============================================================================
-- 7) Validación post-migración (ejecutar manualmente)
-- =============================================================================
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'camiones' AND column_name = 'km_l';
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'configuracion_pagos'
--   AND column_name IN ('precio_combustible_litro', 'precio_espera_minuto');
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'costos_operativos_ruta';
--
-- SELECT id, patente, km_l FROM public.camiones WHERE km_l IS NULL;
