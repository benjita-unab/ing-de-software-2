-- HU-34 v3: pagos asociados a pedidos (desacoplados de rutas).
-- Ejecutar en Supabase SQL Editor después de migraciones HU-34 previas.
--
-- Arquitectura objetivo:
--   Ruta   = plantilla reutilizable (sin relación directa con pagos)
--   Pedido = instancia operativa (tabla futura HU-50+)
--   Pago   = cobro asociado al pedido
--
-- Punto de integración futura:
--   PedidosModule / Portal llamará PagosClienteService.crearPagoParaPedido()
--   al crear un pedido, con pedido_id y monto_calculado=false hasta HU-51.

-- Nuevos campos en pagos_cliente
ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS pedido_id uuid NULL;

ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS proveedor_pago varchar(50) NULL;

ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS monto_calculado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pagos_cliente.pedido_id IS
  'FK futura a pedidos.id. Nullable hasta que exista la entidad Pedido (HU-50).';

COMMENT ON COLUMN public.pagos_cliente.proveedor_pago IS
  'Proveedor de pasarela: transbank, manual, transferencia, etc.';

COMMENT ON COLUMN public.pagos_cliente.monto_calculado IS
  'false = monto pendiente de cálculo (HU-51). true = monto_total vigente.';

COMMENT ON TABLE public.pagos_cliente IS
  'Cobros B2B asociados a pedidos. HU-34 desacoplado de rutas.';

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_pedido_id
  ON public.pagos_cliente(pedido_id)
  WHERE pedido_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_proveedor_pago
  ON public.pagos_cliente(proveedor_pago)
  WHERE proveedor_pago IS NOT NULL;

-- Datos legacy: si ya tenían monto > 0 asumimos que fue calculado.
UPDATE public.pagos_cliente
SET monto_calculado = true
WHERE monto_calculado = false
  AND monto_total > 0;

-- Columnas legacy en rutas (pago_cliente_id, monto_pago_cliente):
-- NO se eliminan para compatibilidad, pero HU-34 ya no las utiliza.
COMMENT ON COLUMN public.rutas.pago_cliente_id IS
  'DEPRECADO HU-34 v3. Usar pagos_cliente.pedido_id. Se eliminará en migración futura.';
