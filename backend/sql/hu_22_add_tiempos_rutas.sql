ALTER TABLE rutas 
ADD COLUMN hora_llegada_destino TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN hora_inspeccion_aprobada TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN tiempo_espera_minutos INTEGER DEFAULT NULL;

COMMENT ON COLUMN rutas.hora_llegada_destino IS 'Timestamp de cuando el conductor presiona Llegada a Destino';
COMMENT ON COLUMN rutas.hora_inspeccion_aprobada IS 'Timestamp de cuando el conductor aprueba la inspeccion e inicia la descarga';
COMMENT ON COLUMN rutas.tiempo_espera_minutos IS 'Diferencia en minutos entre llegada a destino y la aprobacion de la inspeccion';
