-- HU-34 hardening: congelar monto por ruta al crear el pago.
-- Ejecutar en Supabase SQL Editor DESPUÉS de hu_34_pagos_cliente_v2.sql.

ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS monto_pago_cliente numeric(12, 2) NULL;

COMMENT ON COLUMN public.rutas.monto_pago_cliente IS
  'Monto congelado al asociar la ruta a un pago cliente (HU-34). No se recalcula.';

ALTER TABLE public.rutas
  ADD CONSTRAINT rutas_monto_pago_cliente_nonneg
  CHECK (monto_pago_cliente IS NULL OR monto_pago_cliente >= 0);

-- Backfill datos existentes (pagos creados antes del hardening):
-- rutas con un único pago → monto_total completo.
UPDATE public.rutas r
SET monto_pago_cliente = pc.monto_total
FROM public.pagos_cliente pc
WHERE r.pago_cliente_id = pc.id
  AND r.monto_pago_cliente IS NULL
  AND (
    SELECT COUNT(*)::int
    FROM public.rutas r2
    WHERE r2.pago_cliente_id = pc.id
  ) = 1;

-- Pagos con varias rutas sin monto congelado: reparto equitativo con ajuste en la última ruta.
WITH pagos_multiples AS (
  SELECT pc.id AS pago_id, pc.monto_total
  FROM public.pagos_cliente pc
  WHERE (
    SELECT COUNT(*)::int
    FROM public.rutas r2
    WHERE r2.pago_cliente_id = pc.id
  ) > 1
),
rutas_ordenadas AS (
  SELECT
    r.id AS ruta_id,
    r.pago_cliente_id,
    pm.monto_total,
    ROW_NUMBER() OVER (
      PARTITION BY r.pago_cliente_id
      ORDER BY r.fecha_fin NULLS LAST, r.id
    ) AS rn,
    COUNT(*) OVER (PARTITION BY r.pago_cliente_id) AS total_rutas
  FROM public.rutas r
  JOIN pagos_multiples pm ON pm.pago_id = r.pago_cliente_id
  WHERE r.monto_pago_cliente IS NULL
),
reparto AS (
  SELECT
    ruta_id,
    CASE
      WHEN rn < total_rutas THEN
        ROUND(monto_total / total_rutas, 2)
      ELSE
        monto_total - ROUND(monto_total / total_rutas, 2) * (total_rutas - 1)
    END AS monto_asignado
  FROM rutas_ordenadas
)
UPDATE public.rutas r
SET monto_pago_cliente = reparto.monto_asignado
FROM reparto
WHERE r.id = reparto.ruta_id;
