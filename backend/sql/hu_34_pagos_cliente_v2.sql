-- HU-34: Gestión de pagos para clientes B2B.
-- Modelo pedido-centrico (v3). Ejecutar en Supabase SQL Editor.
-- Para instalaciones que ya tienen v2 legacy, usar hu_34_pagos_cliente_pedidos_v3.sql.

CREATE TABLE IF NOT EXISTS public.pagos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  pedido_id uuid NULL,
  monto_total numeric(12, 2) NOT NULL DEFAULT 0,
  monto_calculado boolean NOT NULL DEFAULT false,
  estado varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_pago timestamptz NULL,
  metodo_pago varchar(50) NULL,
  referencia_transaccion varchar(100) NULL,
  proveedor_pago varchar(50) NULL,
  CONSTRAINT pagos_cliente_estado_check CHECK (estado IN ('PENDIENTE', 'PROCESANDO', 'PAGADO')),
  CONSTRAINT pagos_cliente_monto_nonneg CHECK (monto_total >= 0)
);

COMMENT ON TABLE public.pagos_cliente IS
  'Cobros B2B asociados a pedidos. El pago se origina al crear el pedido, no desde rutas.';

COMMENT ON COLUMN public.pagos_cliente.pedido_id IS
  'FK futura a pedidos.id. Nullable hasta entidad Pedido (HU-50).';

COMMENT ON COLUMN public.pagos_cliente.monto_calculado IS
  'false = pendiente de cálculo (HU-51). true = monto_total vigente.';

COMMENT ON COLUMN public.pagos_cliente.referencia_transaccion IS
  'Token o buy_order Transbank. NULL hasta confirmar pago online.';

COMMENT ON COLUMN public.pagos_cliente.proveedor_pago IS
  'Proveedor: transbank, manual, transferencia, etc.';

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_cliente_id
  ON public.pagos_cliente(cliente_id);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_pedido_id
  ON public.pagos_cliente(pedido_id)
  WHERE pedido_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_estado
  ON public.pagos_cliente(estado);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_fecha_creacion
  ON public.pagos_cliente(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_referencia_transaccion
  ON public.pagos_cliente(referencia_transaccion)
  WHERE referencia_transaccion IS NOT NULL;
