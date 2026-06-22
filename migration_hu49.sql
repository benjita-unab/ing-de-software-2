-- Migración para añadir slots_utilizados y talla a la tabla camiones
-- HU-49 GESTIÓN DE CARGA DEL CAMIÓN

ALTER TABLE public.camiones
ADD COLUMN slots_utilizados integer DEFAULT 0,
ADD COLUMN talla text;

-- Si había datos antiguos y quieres inicializarlos basados en su capacidad_kg antigua, 
-- o simplemente inicializar talla:
UPDATE public.camiones
SET talla = 
  CASE 
    WHEN slots <= 32 THEN 'CHICO'
    WHEN slots <= 64 THEN 'MEDIANO'
    ELSE 'GRANDE'
  END
WHERE slots IS NOT NULL;
