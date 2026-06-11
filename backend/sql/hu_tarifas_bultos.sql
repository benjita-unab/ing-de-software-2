-- =============================================================================
-- HU: Tarifas y Bultos — Modelo de Datos Unificado, Completo y Corregido
-- =============================================================================

-- 1) Enum de estados de la ruta (pedido) si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_ruta') THEN
    CREATE TYPE public.estado_ruta AS ENUM (
      'PENDIENTE',
      'ASIGNADO',
      'EN_CAMINO_ORIGEN',
      'EN_CARGA',
      'EN_TRANSITO',
      'EN_DESTINO',
      'ENTREGADO',
      'CANCELADO'
    );
  END IF;
END $$;

-- 2) Tabla de rutas (con estados de pedido y columnas financieras)
CREATE TABLE IF NOT EXISTS public.rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  conductor_id UUID,
  camion_id UUID,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  estado public.estado_ruta DEFAULT 'PENDIENTE'::public.estado_ruta,
  fecha_inicio TIMESTAMP WITH TIME ZONE,
  fecha_fin TIMESTAMP WITH TIME ZONE,
  eta VARCHAR(100),
  distancia_km DECIMAL(10, 2),
  fecha_estimada_inicio DATE,
  fecha_estimada_fin DATE,
  fecha_estimada_entrega DATE,
  bultos_despachados INTEGER,
  hora_llegada_destino TIMESTAMP WITH TIME ZONE,
  hora_inspeccion_aprobada TIMESTAMP WITH TIME ZONE,
  tiempo_espera_minutos INTEGER,
  tarifa_base_total DECIMAL(12, 2) DEFAULT 0.00,
  costo_espera_total DECIMAL(12, 2) DEFAULT 0.00,
  total_pagar DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas financieras y estructura si la tabla ya existía
ALTER TABLE public.rutas
  ADD COLUMN IF NOT EXISTS tarifa_base_total DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS costo_espera_total DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_pagar DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS costo_tac_peajes_clp DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pago_conductor_base_clp DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS costo_combustible_calculado DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_tarifa_manual BOOLEAN DEFAULT FALSE;

-- 2a) Tabla de configuración global (sistema_config)
CREATE TABLE IF NOT EXISTS public.sistema_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  precio_diesel_por_litro DECIMAL(12, 2) NOT NULL DEFAULT 1450.00,
  rendimiento_promedio_km_l DECIMAL(8, 2) NOT NULL DEFAULT 4.50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed de configuración global por defecto
INSERT INTO public.sistema_config (precio_diesel_por_litro, rendimiento_promedio_km_l)
SELECT 1450.00, 4.50
WHERE NOT EXISTS (SELECT 1 FROM public.sistema_config);

-- 2b) Tabla de pagos (para consolidación e historial de pagos)
CREATE TABLE IF NOT EXISTS public.pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL UNIQUE REFERENCES public.rutas(id) ON DELETE CASCADE,
  tarifa_base_total DECIMAL(12, 2) DEFAULT 0.00,
  costo_espera_total DECIMAL(12, 2) DEFAULT 0.00,
  total_pagar DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas de pagos si la tabla ya existía
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS tarifa_base_total DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS costo_espera_total DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_pagar DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Función de sincronización automática desde rutas hacia pagos
CREATE OR REPLACE FUNCTION public.fn_sync_ruta_a_pagos()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pagos (ruta_id, tarifa_base_total, costo_espera_total, total_pagar, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.tarifa_base_total, 0.00),
    COALESCE(NEW.costo_espera_total, 0.00),
    COALESCE(NEW.total_pagar, 0.00),
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (ruta_id) DO UPDATE
  SET 
    tarifa_base_total = EXCLUDED.tarifa_base_total,
    costo_espera_total = EXCLUDED.costo_espera_total,
    total_pagar = EXCLUDED.total_pagar,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ruta_a_pagos ON public.rutas;

CREATE TRIGGER trg_sync_ruta_a_pagos
AFTER INSERT OR UPDATE OF tarifa_base_total, costo_espera_total, total_pagar ON public.rutas
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_ruta_a_pagos();

-- 3) Tabla de matriz tarifaria
CREATE TABLE IF NOT EXISTS public.tarifas_matriz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramo_min_km INT NOT NULL,
  tramo_max_km INT NOT NULL,
  categoria VARCHAR(20) NOT NULL,
  tarifa_clp DECIMAL(12, 2) NOT NULL,
  CONSTRAINT chk_tramos_km CHECK (tramo_min_km >= 0 AND tramo_max_km >= tramo_min_km),
  CONSTRAINT chk_tarifa_positiva CHECK (tarifa_clp >= 0),
  CONSTRAINT uq_tramo_categoria UNIQUE (tramo_min_km, tramo_max_km, categoria)
);

-- 4) Pre-seeding exacto de las 36 tarifas
INSERT INTO public.tarifas_matriz (tramo_min_km, tramo_max_km, categoria, tarifa_clp) VALUES
-- Tramo 1: Corto (0 - 50 Km)
(0, 50, 'XS', 2500.00),
(0, 50, 'S', 4000.00),
(0, 50, 'M', 7500.00),
(0, 50, 'L', 15000.00),
(0, 50, 'XL', 35000.00),
(0, 50, 'MAXIMO', 55000.00),
-- Tramo 2: Medio (51 - 150 Km)
(51, 150, 'XS', 3800.00),
(51, 150, 'S', 5500.00),
(51, 150, 'M', 9800.00),
(51, 150, 'L', 18000.00),
(51, 150, 'XL', 38000.00),
(51, 150, 'MAXIMO', 180000.00),
-- Tramo 3: Largo Inicial (151 - 300 Km)
(151, 300, 'XS', 4900.00),
(151, 300, 'S', 6800.00),
(151, 300, 'M', 12500.00),
(151, 300, 'L', 28000.00),
(151, 300, 'XL', 52000.00),
(151, 300, 'MAXIMO', 420000.00),
-- Tramo 4: Macro-Zonal (301 - 700 Km)
(301, 700, 'XS', 5800.00),
(301, 700, 'S', 7900.00),
(301, 700, 'M', 15000.00),
(301, 700, 'L', 40000.00),
(301, 700, 'XL', 65000.00),
(301, 700, 'MAXIMO', 950000.00),
-- Tramo 5: Gran Distancia (701 - 1500 Km)
(701, 1500, 'XS', 6900.00),
(701, 1500, 'S', 8800.00),
(701, 1500, 'M', 19500.00),
(701, 1500, 'L', 58000.00),
(701, 1500, 'XL', 95000.00),
(701, 1500, 'MAXIMO', 1850000.00),
-- Tramo 6: Extremo Nacional Ruta 5 (1501 - 3500 Km)
(1501, 3500, 'XS', 7500.00),
(1501, 3500, 'S', 9400.00),
(1501, 3500, 'M', 24000.00),
(1501, 3500, 'L', 92000.00),
(1501, 3500, 'XL', 155000.00),
(1501, 3500, 'MAXIMO', 2650000.00)
ON CONFLICT (tramo_min_km, tramo_max_km, categoria) DO UPDATE
SET tarifa_clp = EXCLUDED.tarifa_clp;

-- 5) Tabla de bultos asociados a una ruta (con categoria y categoria_asignada)
CREATE TABLE IF NOT EXISTS public.bultos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  alto_cm DECIMAL(8, 2) NOT NULL,
  ancho_cm DECIMAL(8, 2) NOT NULL,
  largo_cm DECIMAL(8, 2) NOT NULL,
  peso_kg DECIMAL(8, 2) NOT NULL,
  peso_real_kg DECIMAL(8, 2),
  peso_volumetrico DECIMAL(10, 2),
  categoria VARCHAR(20),
  categoria_asignada VARCHAR(20),
  tarifa_calculada_clp DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.bultos
  ADD COLUMN IF NOT EXISTS peso_real_kg DECIMAL(8, 2),
  ADD COLUMN IF NOT EXISTS categoria_asignada VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_bultos_ruta_id ON public.bultos(ruta_id);

-- 6) Trigger para clasificación dinámica por peso volumétrico y seguro de largo excedido
CREATE OR REPLACE FUNCTION public.fn_calcular_categoria_bulto()
RETURNS TRIGGER AS $$
DECLARE
  v_volumen DECIMAL;
  v_peso_vol DECIMAL;
  v_categoria VARCHAR(20);
BEGIN
  -- 1. Validar topes absolutos de dimensiones físicas
  IF NEW.largo_cm > 500.00 OR NEW.ancho_cm > 200.00 OR NEW.alto_cm > 250.00 THEN
    RAISE EXCEPTION 'Excede capacidad física permitida';
  END IF;

  v_volumen := NEW.alto_cm * NEW.ancho_cm * NEW.largo_cm;
  IF v_volumen > 25000000.00 THEN
    RAISE EXCEPTION 'Excede capacidad física permitida';
  END IF;

  -- Sincronizar peso_real_kg y peso_kg
  IF NEW.peso_real_kg IS NULL AND NEW.peso_kg IS NOT NULL THEN
    NEW.peso_real_kg := NEW.peso_kg;
  ELSIF NEW.peso_kg IS NULL AND NEW.peso_real_kg IS NOT NULL THEN
    NEW.peso_kg := NEW.peso_real_kg;
  END IF;

  -- 2. Calcular peso volumétrico con factor 4000
  v_peso_vol := v_volumen / 4000.00;
  NEW.peso_volumetrico := v_peso_vol;

  -- 3. Asignar categoría inicial por peso volumétrico
  IF v_peso_vol <= 2.00 THEN
    v_categoria := 'XS';
  ELSIF v_peso_vol <= 8.00 THEN
    v_categoria := 'S';
  ELSIF v_peso_vol <= 25.00 THEN
    v_categoria := 'M';
  ELSIF v_peso_vol <= 60.00 THEN
    v_categoria := 'L';
  ELSIF v_peso_vol <= 150.00 THEN
    v_categoria := 'XL';
  ELSE
    v_categoria := 'MAXIMO';
  END IF;

  -- 4. Aplicar seguro logístico (salto automático por largo excedido)
  IF NEW.largo_cm > 120.00 AND NEW.largo_cm <= 210.00 THEN
    IF v_categoria IN ('XS', 'S', 'M', 'L') THEN
      v_categoria := 'XL';
    END IF;
  ELSIF NEW.largo_cm > 210.00 THEN
    v_categoria := 'MAXIMO';
  END IF;

  NEW.categoria := v_categoria;
  NEW.categoria_asignada := v_categoria;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bultos_calc_categoria ON public.bultos;

CREATE TRIGGER trg_bultos_calc_categoria
BEFORE INSERT OR UPDATE ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_calcular_categoria_bulto();

-- 7) Trigger para restricción física de volumen acumulado por ruta (Tope: 25.000.000 cm³)
CREATE OR REPLACE FUNCTION public.fn_validar_volumen_acumulado()
RETURNS TRIGGER AS $$
DECLARE
  v_volumen_nuevo DECIMAL;
  v_volumen_acumulado DECIMAL;
BEGIN
  -- Calcular el volumen del bulto entrante o modificado
  v_volumen_nuevo := NEW.alto_cm * NEW.ancho_cm * NEW.largo_cm;

  -- Sumar el volumen de los demás bultos de la ruta (excluyendo el bulto actual en caso de UPDATE)
  SELECT COALESCE(SUM(alto_cm * ancho_cm * largo_cm), 0.00)
  INTO v_volumen_acumulado
  FROM public.bultos
  WHERE ruta_id = NEW.ruta_id
    AND id <> NEW.id;

  -- Validar si supera el tope total de 25 millones de cm³
  IF (v_volumen_acumulado + v_volumen_nuevo) > 25000000.00 THEN
    RAISE EXCEPTION 'Capacidad de volumen excedida para este envío. Requiere coordinar un camión adicional';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bultos_validar_volumen ON public.bultos;

CREATE TRIGGER trg_bultos_validar_volumen
BEFORE INSERT OR UPDATE ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_volumen_acumulado();

-- 8) Trigger de totalización financiera en rutas
CREATE OR REPLACE FUNCTION public.fn_totalizar_tarifa_ruta()
RETURNS TRIGGER AS $$
DECLARE
  v_ruta_id UUID;
  v_tarifa_base_total DECIMAL(12, 2);
  v_costo_espera_total DECIMAL(12, 2);
  v_is_manual BOOLEAN;
BEGIN
  -- Identificar la ruta (NEW para INSERT/UPDATE, OLD para DELETE)
  IF TG_OP = 'DELETE' THEN
    v_ruta_id := OLD.ruta_id;
  ELSE
    v_ruta_id := NEW.ruta_id;
  END IF;

  -- Obtener el estado de tarifa_manual y costo de espera de la ruta
  SELECT COALESCE(is_tarifa_manual, FALSE), COALESCE(costo_espera_total, 0.00)
  INTO v_is_manual, v_costo_espera_total
  FROM public.rutas
  WHERE id = v_ruta_id;

  IF v_is_manual = TRUE THEN
    -- Si es manual, no recalculamos la tarifa_base_total de la ruta (respetamos el override).
    -- Pero sí actualizamos el total_pagar.
    UPDATE public.rutas
    SET total_pagar = COALESCE(tarifa_base_total, 0.00) + v_costo_espera_total
    WHERE id = v_ruta_id;
  ELSE
    -- Si no es manual, recalculamos desde la sumatoria de bultos
    SELECT COALESCE(SUM(tarifa_calculada_clp), 0.00)
    INTO v_tarifa_base_total
    FROM public.bultos
    WHERE ruta_id = v_ruta_id;

    UPDATE public.rutas
    SET 
      tarifa_base_total = v_tarifa_base_total,
      total_pagar = v_tarifa_base_total + v_costo_espera_total
    WHERE id = v_ruta_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bultos_totalizar_tarifa ON public.bultos;

CREATE TRIGGER trg_bultos_totalizar_tarifa
AFTER INSERT OR UPDATE OF tarifa_calculada_clp OR DELETE ON public.bultos
FOR EACH ROW
EXECUTE FUNCTION public.fn_totalizar_tarifa_ruta();

-- 9) Trigger para cálculo automático de costos de transporte y combustible en rutas
CREATE OR REPLACE FUNCTION public.fn_calcular_costos_ruta()
RETURNS TRIGGER AS $$
DECLARE
  v_precio_diesel DECIMAL;
  v_rendimiento DECIMAL;
BEGIN
  -- 1. Obtener valores globales de configuración (se toma el último registro o valores por defecto)
  SELECT precio_diesel_por_litro, rendimiento_promedio_km_l
  INTO v_precio_diesel, v_rendimiento
  FROM public.sistema_config
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_precio_diesel IS NULL THEN
    v_precio_diesel := 1450.00;
  END IF;
  IF v_rendimiento IS NULL OR v_rendimiento = 0 THEN
    v_rendimiento := 4.5;
  END IF;

  -- 2. Calcular costo de combustible
  IF NEW.distancia_km IS NOT NULL AND NEW.distancia_km > 0 THEN
    NEW.costo_combustible_calculado := (NEW.distancia_km / v_rendimiento) * v_precio_diesel;
  ELSE
    NEW.costo_combustible_calculado := 0.00;
  END IF;

  -- 3. Si pasa de manual a automático (is_tarifa_manual de TRUE a FALSE),
  -- recalculamos la sumatoria de bultos
  IF (TG_OP = 'UPDATE' AND COALESCE(OLD.is_tarifa_manual, FALSE) = TRUE AND COALESCE(NEW.is_tarifa_manual, FALSE) = FALSE) THEN
    SELECT COALESCE(SUM(tarifa_calculada_clp), 0.00)
    INTO NEW.tarifa_base_total
    FROM public.bultos
    WHERE ruta_id = NEW.id;
  END IF;

  -- 4. Calcular el total a pagar
  NEW.total_pagar := COALESCE(NEW.tarifa_base_total, 0.00) + COALESCE(NEW.costo_espera_total, 0.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rutas_calcular_costos ON public.rutas;

CREATE TRIGGER trg_rutas_calcular_costos
BEFORE INSERT OR UPDATE ON public.rutas
FOR EACH ROW
EXECUTE FUNCTION public.fn_calcular_costos_ruta();
