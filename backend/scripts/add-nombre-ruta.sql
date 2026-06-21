-- Script para añadir 'nombre_ruta' a la tabla 'rutas' y configurar la generación automática
-- HU-46: Nombre Personalizado para Rutas

-- 1. Añadir la columna de forma segura (permitiendo NULL para retrocompatibilidad)
ALTER TABLE public.rutas
ADD COLUMN IF NOT EXISTS nombre_ruta VARCHAR(255) NULL;

-- 2. Crear una secuencia para asegurar nombres únicos e incrementales sin problemas de concurrencia
CREATE SEQUENCE IF NOT EXISTS rutas_nombre_seq START 1;

-- 3. Crear la función del Trigger que auto-generará el nombre si viene vacío
CREATE OR REPLACE FUNCTION set_ruta_nombre_default()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el cliente (backend) no envía un nombre, o envía uno vacío
  IF NEW.nombre_ruta IS NULL OR TRIM(NEW.nombre_ruta) = '' THEN
    NEW.nombre_ruta := 'Ruta#' || nextval('rutas_nombre_seq');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el Trigger (solo al insertar)
DROP TRIGGER IF EXISTS trg_set_ruta_nombre ON public.rutas;

CREATE TRIGGER trg_set_ruta_nombre
BEFORE INSERT ON public.rutas
FOR EACH ROW
EXECUTE FUNCTION set_ruta_nombre_default();

-- NOTA: Las rutas preexistentes mantendrán su nombre_ruta en NULL.
-- El Frontend se encargará de mostrar un fallback (ej. "Ruta Antigua").
