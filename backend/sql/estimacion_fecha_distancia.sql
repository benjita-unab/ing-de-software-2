-- HU-24: distancia aproximada usada para estimar fechas de entrega (fechas en HU-9)

ALTER TABLE rutas
ADD COLUMN IF NOT EXISTS distancia_km NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN rutas.distancia_km IS 'Distancia vial origen-destino (km), Google Routes o ajuste manual (HU-24)';
