-- HU-58: Creación de pedidos basados en rutas reutilizables.
-- El pedido operativo vive en `rutas`; la plantilla en `rutas_plantilla`.
-- Ejecutar en Supabase SQL Editor.

-- Vínculo pedido → plantilla origen (sin modificar la plantilla).
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS ruta_plantilla_id uuid NULL
    REFERENCES public.rutas_plantilla(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rutas.ruta_plantilla_id IS
  'Plantilla de ruta usada al originar el pedido (HU-58). Nullable para rutas manuales.';

CREATE INDEX IF NOT EXISTS idx_rutas_ruta_plantilla_id
  ON public.rutas(ruta_plantilla_id)
  WHERE ruta_plantilla_id IS NOT NULL;

-- Observaciones propias del pedido.
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS observaciones text NULL;

COMMENT ON COLUMN public.rutas.observaciones IS
  'Notas operativas del pedido/ruta (HU-58).';

-- Paradas temporales del pedido (no modifican rutas_plantilla_paradas).
CREATE TABLE IF NOT EXISTS public.rutas_paradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  direccion text NOT NULL,
  orden integer NOT NULL,
  latitud numeric(10, 7) NULL,
  longitud numeric(10, 7) NULL,
  es_temporal boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rutas_paradas_direccion_not_blank CHECK (trim(direccion) <> ''),
  CONSTRAINT rutas_paradas_orden_positive CHECK (orden > 0),
  CONSTRAINT rutas_paradas_orden_unique UNIQUE (ruta_id, orden)
);

COMMENT ON TABLE public.rutas_paradas IS
  'Paradas intermedias del pedido/ruta operativa (HU-58). Copia de plantilla + paradas adicionales.';

CREATE INDEX IF NOT EXISTS idx_rutas_paradas_ruta_id
  ON public.rutas_paradas(ruta_id);
