-- Migración HU-46: Nombre Personalizado para Rutas
-- Objetivo: Agregar campo nombre_ruta con fallback automático 'Ruta#XXX'

-- 1. Agregar el campo a la tabla rutas (permite NULL para no romper históricos)
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS nombre_ruta character varying(255) DEFAULT NULL;

-- 2. Crear secuencia para los nombres generados automáticamente
CREATE SEQUENCE IF NOT EXISTS rutas_nombre_seq START 1;

-- 3. Crear función trigger para asignar nombre por defecto si no viene
CREATE OR REPLACE FUNCTION set_default_nombre_ruta()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el nombre viene nulo o vacío, usamos la secuencia
  IF NEW.nombre_ruta IS NULL OR TRIM(NEW.nombre_ruta) = '' THEN
    NEW.nombre_ruta := 'Ruta#' || nextval('rutas_nombre_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Asignar el trigger a la tabla rutas
DROP TRIGGER IF EXISTS trg_set_default_nombre_ruta ON public.rutas;
CREATE TRIGGER trg_set_default_nombre_ruta
BEFORE INSERT ON public.rutas
FOR EACH ROW
EXECUTE FUNCTION set_default_nombre_ruta();

-- Nota: No actualizamos los registros antiguos para mantener Zero Breaking Change.
-- La vista frontend usará una función utilitaria para proveer un fallback.
