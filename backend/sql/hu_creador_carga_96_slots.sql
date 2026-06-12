-- =============================================================================
-- PROYECTO ACADÉMICO: CREADOR DE CARGA (Modelo 96 Micro-bloques - 100% Capacidad)
-- =============================================================================

-- 1) ACTUALIZACIÓN DE CAMIONES
ALTER TABLE public.camiones 
  ADD COLUMN IF NOT EXISTS rendimiento_km_l DECIMAL(8, 2) DEFAULT 4.50,
  ADD COLUMN IF NOT EXISTS slots INT DEFAULT 96;

-- 2) ACTUALIZACIÓN DE RUTAS
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS fecha_estimada_entrega TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS alerta_sub_financiada BOOLEAN DEFAULT false;

-- 3) ACTUALIZACIÓN Y CREACIÓN DE BULTOS
CREATE TABLE IF NOT EXISTS public.bultos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  tamaño VARCHAR(20),
  categoria VARCHAR(20),
  categoria_asignada VARCHAR(20),
  cuadrados_equivalentes DECIMAL(6, 2) DEFAULT 0.00,
  tarifa_calculada_clp DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Si la tabla ya existía con campos físicos, los eliminamos
ALTER TABLE public.bultos 
  DROP COLUMN IF EXISTS alto_cm,
  DROP COLUMN IF EXISTS ancho_cm,
  DROP COLUMN IF EXISTS largo_cm,
  DROP COLUMN IF EXISTS peso_kg,
  DROP COLUMN IF EXISTS peso_volumetrico,
  DROP COLUMN IF EXISTS peso_real_kg;

-- A. Remover el constraint anterior si existe
ALTER TABLE public.bultos DROP CONSTRAINT IF EXISTS bultos_tamaño_check;
-- B. Añadir el nuevo constraint
ALTER TABLE public.bultos ADD CONSTRAINT bultos_tamaño_check 
  CHECK (tamaño IN ('XS', 'S', 'M', 'L', 'XL', 'MAXIMO'));

-- 4) ELIMINACIÓN DE MATRIZ DE TARIFAS (Lógica trasladada al Frontend)
DROP TABLE IF EXISTS public.tarifas_matriz;

-- 5) TRIGGER: LÍMITE DE 96 SLOTS POR RUTA
CREATE OR REPLACE FUNCTION public.fn_validar_capacidad_slots()
RETURNS TRIGGER AS $$
DECLARE
  v_slots_usados DECIMAL(6, 2);
  v_tope CONSTANT DECIMAL(6, 2) := 96.00;
BEGIN
  SELECT COALESCE(SUM(cuadrados_equivalentes), 0)
    INTO v_slots_usados
    FROM public.bultos
    WHERE ruta_id = NEW.ruta_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  IF (v_slots_usados + NEW.cuadrados_equivalentes) > v_tope THEN
    RAISE EXCEPTION 'Capacidad máxima del camión excedida (Tope 96 micro-bloques). Intentas usar %', (v_slots_usados + NEW.cuadrados_equivalentes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_capacidad_slots ON public.bultos;
CREATE TRIGGER trg_validar_capacidad_slots
  BEFORE INSERT OR UPDATE ON public.bultos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validar_capacidad_slots();
