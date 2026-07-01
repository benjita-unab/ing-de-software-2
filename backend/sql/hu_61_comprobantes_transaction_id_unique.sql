-- Sprint 5.5: idempotencia de comprobantes por transaction_id (buy_order Transbank).
-- Ejecutar manualmente en Supabase SQL Editor.
-- Verificar duplicados antes de aplicar:
--   SELECT transaction_id, COUNT(*) FROM public.comprobantes_pago
--   GROUP BY transaction_id HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS comprobantes_pago_transaction_id_unique
  ON public.comprobantes_pago (transaction_id);

COMMENT ON INDEX public.comprobantes_pago_transaction_id_unique IS
  'Garantiza un solo comprobante por buy_order Transbank (idempotencia de callback).';
