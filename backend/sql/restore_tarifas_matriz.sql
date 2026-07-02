-- =============================================================================
-- Restauración de public.tarifas_matriz
-- Fuente: commit 7416ca0 (backend/sql/hu_tarifas_bultos.sql)
-- Compatible con: cargarMatrizTarifas(), calcularTarifaComercial(),
--                 aplicarTarifaComercialARuta() en rutas.service.ts
--
-- Ejecutar manualmente en Supabase SQL Editor o psql.
-- Idempotente: CREATE IF NOT EXISTS + INSERT ... ON CONFLICT DO UPDATE
-- =============================================================================

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

-- Pre-seeding exacto de las 36 tarifas (6 tramos × 6 categorías)
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
