-- HU-34: preparación integración Transbank (sin implementar pasarela aún).
-- Ejecutar en Supabase SQL Editor después de hu_34_pagos_cliente_v2.sql (+ hardening si aplica).

ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS referencia_transaccion varchar(100) NULL;

COMMENT ON COLUMN public.pagos_cliente.referencia_transaccion IS
  'Token o buy_order de Transbank. NULL hasta confirmar pago online.';

COMMENT ON COLUMN public.pagos_cliente.metodo_pago IS
  'Origen del pago: transbank, transferencia, manual, etc.';

-- Ampliar estados: PENDIENTE → PROCESANDO (checkout) → PAGADO
ALTER TABLE public.pagos_cliente
  DROP CONSTRAINT IF EXISTS pagos_cliente_estado_check;

ALTER TABLE public.pagos_cliente
  ADD CONSTRAINT pagos_cliente_estado_check
  CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'PAGADO'));

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_referencia_transaccion
  ON public.pagos_cliente(referencia_transaccion)
  WHERE referencia_transaccion IS NOT NULL;
