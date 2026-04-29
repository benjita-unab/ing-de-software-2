-- Opcional: vincular eventos de trazabilidad móvil con la ruta (UUID).
-- Ejecutar en Supabase SQL Editor cuando quieras dejar de depender solo del fallback temporal.
--
-- Si la columna ya existe, omitir el ALTER.

ALTER TABLE public.traceability_events
  ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES public.rutas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_traceability_events_ruta_id
  ON public.traceability_events (ruta_id)
  WHERE ruta_id IS NOT NULL;

COMMENT ON COLUMN public.traceability_events.ruta_id IS
  'Ruta asociada al evento (mobile envía ruta_id en POST /api/trazabilidad).';
