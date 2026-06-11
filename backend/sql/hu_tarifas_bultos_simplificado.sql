-- =============================================================================
-- PROYECTO ACADÉMICO: SISTEMA-PAÑOL (Modelo Simplificado de Capacidad por Bloques)
-- MIGRACIÓN PARA TABLAS EXISTENTES: public.rutas y public.bultos
-- =============================================================================

-- 1) Tabla de configuración global (sistema_config) - Asegurar campos requeridos
CREATE TABLE IF NOT EXISTS public.sistema_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precio_diesel_actual DECIMAL(12, 2) NOT NULL DEFAULT 1450.00,
  rendimiento_km_l DECIMAL(8, 2) NOT NULL DEFAULT 4.50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas si la tabla ya existía con otros nombres
ALTER TABLE public.sistema_config
  ADD COLUMN IF NOT EXISTS precio_diesel_actual DECIMAL(12, 2) DEFAULT 1450.00,
  ADD COLUMN IF NOT EXISTS rendimiento_km_l DECIMAL(8, 2) DEFAULT 4.50;

-- Seed por defecto si está vacía
INSERT INTO public.sistema_config (precio_diesel_actual, rendimiento_km_l)
SELECT 1450.00, 4.50
WHERE NOT EXISTS (SELECT 1 FROM public.sistema_config);


-- 2) Ajustes a la tabla de bultos para el modelo simplificado
ALTER TABLE public.bultos
  ADD COLUMN IF NOT EXISTS tamaño VARCHAR(20) CHECK (tamaño IN ('S', 'M', 'L', 'XL', 'MAXIMO')),
  ADD COLUMN IF NOT EXISTS cuadrados_equivalentes DECIMAL(4, 2) DEFAULT 0.00;

-- Asegurar indexación
CREATE INDEX IF NOT EXISTS idx_bultos_ruta_id_simplificado ON public.bultos(ruta_id);


-- 3) Matriz de Tarifas Básicas Académicas
CREATE TABLE IF NOT EXISTS public.tarifas_matriz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramo_min_km INT NOT NULL,
  tramo_max_km INT NOT NULL,
  categoria VARCHAR(20) NOT NULL, -- S, M, L, XL, MAXIMO
  tarifa_clp DECIMAL(12, 2) NOT NULL,
  CONSTRAINT chk_tramos_km CHECK (tramo_min_km >= 0 AND tramo_max_km >= tramo_min_km),
  CONSTRAINT chk_tarifa_positiva CHECK (tarifa_clp >= 0),
  CONSTRAINT uq_tramo_categoria UNIQUE (tramo_min_km, tramo_max_km, categoria)
);

-- Limpiar tarifas anteriores para evitar conflictos con el nuevo modelo simplificado
TRUNCATE TABLE public.tarifas_matriz;

-- Insertar tarifas académicas para el modelo simplificado (6 Tramos, 5 Tamaños)
INSERT INTO public.tarifas_matriz (tramo_min_km, tramo_max_km, categoria, tarifa_clp) VALUES
-- Tramo 1: 0 - 50 Km
(0, 50, 'S', 1500.00),
(0, 50, 'M', 2500.00),
(0, 50, 'L', 4500.00),
(0, 50, 'XL', 7000.00),
(0, 50, 'MAXIMO', 12000.00),
-- Tramo 2: 51 - 150 Km
(51, 150, 'S', 3000.00),
(51, 150, 'M', 5000.00),
(51, 150, 'L', 9000.00),
(51, 150, 'XL', 14000.00),
(51, 150, 'MAXIMO', 24000.00),
-- Tramo 3: 151 - 300 Km
(151, 300, 'S', 4500.00),
(151, 300, 'M', 7500.00),
(151, 300, 'L', 13500.00),
(151, 300, 'XL', 21000.00),
(151, 300, 'MAXIMO', 36000.00),
-- Tramo 4: 301 - 500 Km
(301, 500, 'S', 6000.00),
(301, 500, 'M', 10000.00),
(301, 500, 'L', 18000.00),
(301, 500, 'XL', 28000.00),
(301, 500, 'MAXIMO', 480000.00), -- MAXIMO bloquea el camión, tarifa alta
-- Tramo 5: 501 - 1000 Km
(501, 1000, 'S', 8000.00),
(501, 1000, 'M', 13000.00),
(501, 1000, 'L', 24000.00),
(501, 1000, 'XL', 38000.00),
(501, 1000, 'MAXIMO', 750000.00),
-- Tramo 6: Más de 1000 Km (Límite superior amplio)
(1001, 99999, 'S', 10000.00),
(1001, 99999, 'M', 16000.00),
(1001, 99999, 'L', 30000.00),
(1001, 99999, 'XL', 48000.00),
(1001, 99999, 'MAXIMO', 1200000.00);


-- 4) Triggers para Regla de 6 Cuadrados y Cálculos de Bultos

-- Trigger de validación física de capacidad acumulada en la ruta
CREATE OR REPLACE FUNCTION public.fn_validar_capacidad_cuadrados()
RETURNS TRIGGER AS $$
DECLARE
  v_cuadrados_bulto DECIMAL(4, 2);
  v_cuadrados_acumulados DECIMAL(4, 2);
BEGIN
  -- Calcular el valor de cuadrados según el tamaño seleccionado
  IF NEW.tamaño = 'S' THEN
    v_cuadrados_bulto := 0.25;
  ELSIF NEW.tamaño = 'M' THEN
    v_cuadrados_bulto := 0.50;
  ELSIF NEW.tamaño = 'L' THEN
    v_cuadrados_bulto := 0.75;
  ELSIF NEW.tamaño = 'XL' THEN
    v_cuadrados_bulto := 1.00;
  ELSIF NEW.tamaño = 'MAXIMO' THEN
    v_cuadrados_bulto := COALESCE(NEW.cuadrados_equivalentes, 5.00);
    IF v_cuadrados_bulto < 5.00 OR v_cuadrados_bulto > 6.00 THEN
      v_cuadrados_bulto := 5.00; -- Valor por defecto seguro para MAXIMO
    END IF;
  ELSE
    RAISE EXCEPTION 'Tamaño de bulto inválido: %', NEW.tamaño;
  END IF;

  -- Guardar en el registro el valor correspondiente
  NEW.cuadrados_equivalentes := v_cuadrados_bulto;

  -- Sumar los cuadrados de los otros bultos en la misma ruta
  SELECT COALESCE(SUM(cuadrados_equivalentes), 0.00)
  INTO v_cuadrados_acumulados
  FROM public.bultos
  WHERE ruta_id = NEW.ruta_id
    AND id <> NEW.id;

  -- Validar si supera el tope total de 6 cuadrados del camión
  IF (v_cuadrados_acumulados + v_cuadrados_bulto) > 6.00 THEN
    RAISE EXCEPTION 'Capacidad del camión excedida (Máximo 6 cuadrados)';
  END IF;

  -- Para compatibilidad de triggers anteriores, asignamos valores por defecto a alto, ancho, largo, peso
  NEW.alto_cm := COALESCE(NEW.alto_cm, 10.00);
  NEW.ancho_cm := COALESCE(NEW.ancho_cm, 10.00);
  NEW.largo_cm := COALESCE(NEW.largo_cm, 10.00);
  NEW.peso_kg := COALESCE(NEW.peso_kg, 1.00);
  NEW.peso_real_kg := COALESCE(NEW.peso_real_kg, NEW.peso_kg);
  NEW.categoria := NEW.tamaño;
  NEW.categoria_asignada := NEW.tamaño;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropear triggers antiguos que entren en conflicto con el cálculo físico/volumétrico
DROP TRIGGER IF EXISTS trg_bultos_calc_categoria ON public.bultos;
DROP TRIGGER IF EXISTS trg_bultos_validar_volumen ON public.bultos;
DROP TRIGGER IF EXISTS trg_bultos_simplificado_valida ON public.bultos;

CREATE TRIGGER trg_bultos_simplificado_valida
BEFORE INSERT OR UPDATE ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_capacidad_cuadrados();


-- Trigger para calcular tarifas de cada bulto (Lookup)
CREATE OR REPLACE FUNCTION public.fn_calcular_tarifa_bulto_simplificado()
RETURNS TRIGGER AS $$
DECLARE
  v_distancia DECIMAL(10, 2);
  v_tarifa DECIMAL(12, 2);
BEGIN
  -- Obtener la distancia de la ruta
  SELECT COALESCE(distancia_km, 0.00)
  INTO v_distancia
  FROM public.rutas
  WHERE id = NEW.ruta_id;

  -- Buscar la tarifa correspondiente en la matriz
  SELECT tarifa_clp
  INTO v_tarifa
  FROM public.tarifas_matriz
  WHERE categoria = NEW.tamaño
    AND v_distancia >= tramo_min_km
    AND v_distancia <= tramo_max_km
  LIMIT 1;

  -- Fallback en caso de no encontrar coincidencia
  IF v_tarifa IS NULL THEN
    IF NEW.tamaño = 'S' THEN v_tarifa := 2000.00;
    ELSIF NEW.tamaño = 'M' THEN v_tarifa := 4000.00;
    ELSIF NEW.tamaño = 'L' THEN v_tarifa := 7000.00;
    ELSIF NEW.tamaño = 'XL' THEN v_tarifa := 12000.00;
    ELSE v_tarifa := 50000.00; -- MAXIMO
    END IF;
  END IF;

  NEW.tarifa_calculada_clp := v_tarifa;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bultos_simplificado_tarifa ON public.bultos;

CREATE TRIGGER trg_bultos_simplificado_tarifa
BEFORE INSERT OR UPDATE OF tamaño ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_calcular_tarifa_bulto_simplificado();


-- 5) Trigger de totalización financiera en rutas (Suma de bultos + Combustible)
CREATE OR REPLACE FUNCTION public.fn_calcular_costos_ruta_simplificado()
RETURNS TRIGGER AS $$
DECLARE
  v_precio_diesel DECIMAL;
  v_rendimiento DECIMAL;
  v_tarifa_bultos DECIMAL(12, 2);
BEGIN
  -- 1. Obtener valores globales de configuración
  SELECT precio_diesel_actual, rendimiento_km_l
  INTO v_precio_diesel, v_rendimiento
  FROM public.sistema_config
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_precio_diesel IS NULL THEN v_precio_diesel := 1450.00; END IF;
  IF v_rendimiento IS NULL OR v_rendimiento = 0 THEN v_rendimiento := 4.5; END IF;

  -- 2. Calcular costo de combustible
  IF NEW.distancia_km IS NOT NULL AND NEW.distancia_km > 0 THEN
    NEW.costo_combustible_calculado := (NEW.distancia_km / v_rendimiento) * v_precio_diesel;
  ELSE
    NEW.costo_combustible_calculado := 0.00;
  END IF;

  -- 3. Si no es manual, recalculamos desde la sumatoria de bultos
  IF COALESCE(NEW.is_tarifa_manual, FALSE) = FALSE THEN
    SELECT COALESCE(SUM(tarifa_calculada_clp), 0.00)
    INTO v_tarifa_bultos
    FROM public.bultos
    WHERE ruta_id = NEW.id;

    NEW.tarifa_base_total := v_tarifa_bultos;
  END IF;

  -- 4. Calcular el total a pagar
  NEW.total_pagar := COALESCE(NEW.tarifa_base_total, 0.00) 
                     + COALESCE(NEW.costo_combustible_calculado, 0.00) 
                     + COALESCE(NEW.costo_tac_peajes_clp, 0.00) 
                     + COALESCE(NEW.pago_conductor_base_clp, 0.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rutas_calcular_costos ON public.rutas;
DROP TRIGGER IF EXISTS trg_rutas_simplificado_costos ON public.rutas;

CREATE TRIGGER trg_rutas_simplificado_costos
BEFORE INSERT OR UPDATE ON public.rutas
FOR EACH ROW
EXECUTE FUNCTION public.fn_calcular_costos_ruta_simplificado();


-- Trigger adicional para disparar la actualización de la ruta cuando se modifican los bultos
CREATE OR REPLACE FUNCTION public.fn_bultos_simplificado_totaliza()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ruta_id := OLD.ruta_id;
  ELSE
    v_ruta_id := NEW.ruta_id;
  END IF;

  -- Forzar la actualización de la ruta para disparar trg_rutas_simplificado_costos
  UPDATE public.rutas
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = v_ruta_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bultos_totalizar_tarifa ON public.bultos;
DROP TRIGGER IF EXISTS trg_bultos_simplificado_totaliza ON public.bultos;

-- Aseguramos la existencia de updated_at para el trigger
ALTER TABLE public.rutas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER trg_bultos_simplificado_totaliza
AFTER INSERT OR UPDATE OF tarifa_calculada_clp OR DELETE ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_bultos_simplificado_totaliza();


-- 6) Habilitar Replicación de Supabase Realtime
-- Remueve si ya existe para evitar errores, luego añade
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rutas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bultos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sistema_config;
