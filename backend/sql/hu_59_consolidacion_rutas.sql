  -- HU-59: Consolidación de múltiples pedidos en una misma ruta logística.
  -- Cada pedido sigue siendo una fila en `rutas`; los hijos apuntan al maestro vía ruta_maestra_id.
  -- Ejecutar en Supabase SQL Editor.

  ALTER TABLE public.rutas
    ADD COLUMN IF NOT EXISTS ruta_maestra_id uuid NULL
      REFERENCES public.rutas(id) ON DELETE SET NULL;

  COMMENT ON COLUMN public.rutas.ruta_maestra_id IS
    'Pedido consolidado bajo la ruta maestra (HU-59). NULL = pedido independiente o ruta maestra.';

  CREATE INDEX IF NOT EXISTS idx_rutas_ruta_maestra_id
    ON public.rutas(ruta_maestra_id)
    WHERE ruta_maestra_id IS NOT NULL;

  -- Evitar ciclos: un pedido no puede ser maestro de sí mismo.
  ALTER TABLE public.rutas
    DROP CONSTRAINT IF EXISTS rutas_ruta_maestra_no_self;

  ALTER TABLE public.rutas
    ADD CONSTRAINT rutas_ruta_maestra_no_self
    CHECK (ruta_maestra_id IS NULL OR ruta_maestra_id <> id);
