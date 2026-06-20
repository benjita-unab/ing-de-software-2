-- HU-57: Rutas reutilizables (plantillas).
-- Desacoplado de la tabla `rutas` (ejecuciones operativas).
-- Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.rutas_plantilla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(150) NOT NULL,
  origen text NOT NULL,
  destino text NOT NULL,
  distancia_estimada numeric(12, 2) NULL,
  tiempo_estimado integer NULL,
  activa boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rutas_plantilla_nombre_not_blank CHECK (trim(nombre) <> ''),
  CONSTRAINT rutas_plantilla_distancia_nonneg CHECK (
    distancia_estimada IS NULL OR distancia_estimada >= 0
  ),
  CONSTRAINT rutas_plantilla_tiempo_nonneg CHECK (
    tiempo_estimado IS NULL OR tiempo_estimado >= 0
  )
);

COMMENT ON TABLE public.rutas_plantilla IS
  'Plantillas de ruta reutilizables (HU-57). Una plantilla puede usarse en múltiples pedidos (HU-58).';

CREATE TABLE IF NOT EXISTS public.rutas_plantilla_paradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES public.rutas_plantilla(id) ON DELETE CASCADE,
  direccion text NOT NULL,
  orden integer NOT NULL,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rutas_plantilla_paradas_direccion_not_blank CHECK (trim(direccion) <> ''),
  CONSTRAINT rutas_plantilla_paradas_orden_positive CHECK (orden > 0),
  CONSTRAINT rutas_plantilla_paradas_orden_unique UNIQUE (ruta_id, orden)
);

COMMENT ON TABLE public.rutas_plantilla_paradas IS
  'Paradas intermedias de una plantilla de ruta (HU-57).';

CREATE INDEX IF NOT EXISTS idx_rutas_plantilla_nombre
  ON public.rutas_plantilla(nombre);

CREATE INDEX IF NOT EXISTS idx_rutas_plantilla_activa
  ON public.rutas_plantilla(activa);

CREATE INDEX IF NOT EXISTS idx_rutas_plantilla_fecha_creacion
  ON public.rutas_plantilla(fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_rutas_plantilla_paradas_ruta_id
  ON public.rutas_plantilla_paradas(ruta_id);

-- HU-58: cuando exista `pedidos`, agregar:
--   ALTER TABLE public.pedidos ADD COLUMN ruta_plantilla_id uuid NULL
--     REFERENCES public.rutas_plantilla(id) ON DELETE RESTRICT;
--   CREATE INDEX idx_pedidos_ruta_plantilla_id ON public.pedidos(ruta_plantilla_id);
