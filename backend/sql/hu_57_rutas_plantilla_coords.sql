-- HU-57: coordenadas opcionales para plantillas de ruta (HU-58 / HU-59).
-- Ejecutar después de hu_57_rutas_plantilla.sql.

ALTER TABLE public.rutas_plantilla
  ADD COLUMN IF NOT EXISTS origen_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS origen_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS destino_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS destino_lng double precision NULL;

ALTER TABLE public.rutas_plantilla_paradas
  ADD COLUMN IF NOT EXISTS latitud double precision NULL,
  ADD COLUMN IF NOT EXISTS longitud double precision NULL;

COMMENT ON COLUMN public.rutas_plantilla.origen_lat IS
  'Latitud del origen (Google Places). Opcional.';
COMMENT ON COLUMN public.rutas_plantilla.destino_lat IS
  'Latitud del destino (Google Places). Opcional.';
COMMENT ON COLUMN public.rutas_plantilla_paradas.latitud IS
  'Latitud de la parada (Google Places). Opcional.';
