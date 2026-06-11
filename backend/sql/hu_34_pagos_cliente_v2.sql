-- HU-34: Gestión de pagos para clientes B2B (v2).
-- Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.pagos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  monto_total numeric(12, 2) NOT NULL DEFAULT 0,
  estado varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_pago timestamptz NULL,
  metodo_pago varchar(50) NULL,
  referencia_transaccion varchar(100) NULL,
  CONSTRAINT pagos_cliente_estado_check CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'PAGADO')),
  CONSTRAINT pagos_cliente_monto_nonneg CHECK (monto_total >= 0)
);

COMMENT ON TABLE public.pagos_cliente IS
  'Pagos agrupados de rutas completadas para clientes B2B (HU-34).';

-- Relación opcional en rutas: una ruta puede pertenecer a un pago de cliente.
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS pago_cliente_id uuid NULL
  REFERENCES public.pagos_cliente(id) ON DELETE SET NULL;

ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS monto_pago_cliente numeric(12, 2) NULL;

COMMENT ON COLUMN public.rutas.monto_pago_cliente IS
  'Monto congelado al asociar la ruta a un pago cliente (HU-34). No se recalcula.';

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_cliente_id
  ON public.pagos_cliente(cliente_id);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_estado
  ON public.pagos_cliente(estado);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_fecha_creacion
  ON public.pagos_cliente(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_rutas_pago_cliente_id
  ON public.rutas(pago_cliente_id)
  WHERE pago_cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rutas_cliente_entregado_sin_pago
  ON public.rutas(cliente_id, estado)
  WHERE pago_cliente_id IS NULL AND estado = 'ENTREGADO';
