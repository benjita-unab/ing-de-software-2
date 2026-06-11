-- =============================================================================
-- HU: Tarifas y Bultos — Rollback Script
-- =============================================================================

-- 1) Eliminar triggers y funciones de sincronización y cálculo
DROP TRIGGER IF EXISTS trg_sync_ruta_a_pagos ON public.rutas;
DROP FUNCTION IF EXISTS public.fn_sync_ruta_a_pagos();

DROP TRIGGER IF EXISTS trg_bultos_calc_categoria ON public.bultos;
DROP FUNCTION IF EXISTS public.fn_calcular_categoria_bulto();

DROP TRIGGER IF EXISTS trg_bultos_validar_volumen ON public.bultos;
DROP FUNCTION IF EXISTS public.fn_validar_volumen_acumulado();

DROP TRIGGER IF EXISTS trg_bultos_totalizar_tarifa ON public.bultos;
DROP FUNCTION IF EXISTS public.fn_totalizar_tarifa_ruta();

DROP TRIGGER IF EXISTS trg_rutas_calcular_costos ON public.rutas;
DROP FUNCTION IF EXISTS public.fn_calcular_costos_ruta();

-- 2) Eliminar tablas creadas
DROP TABLE IF EXISTS public.pagos CASCADE;
DROP TABLE IF EXISTS public.tarifas_matriz CASCADE;
DROP TABLE IF EXISTS public.sistema_config CASCADE;

-- 3) Eliminar columnas añadidas en bultos
ALTER TABLE public.bultos
  DROP COLUMN IF EXISTS peso_real_kg,
  DROP COLUMN IF EXISTS categoria_asignada;

-- 4) Eliminar columnas añadidas en rutas
ALTER TABLE public.rutas
  DROP COLUMN IF EXISTS tarifa_base_total,
  DROP COLUMN IF EXISTS costo_espera_total,
  DROP COLUMN IF EXISTS total_pagar,
  DROP COLUMN IF EXISTS costo_tac_peajes_clp,
  DROP COLUMN IF EXISTS pago_conductor_base_clp,
  DROP COLUMN IF EXISTS costo_combustible_calculado,
  DROP COLUMN IF EXISTS is_tarifa_manual;
