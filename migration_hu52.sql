-- Añadir nuevos estados de ruta para el flujo de pago por atrasos
ALTER TYPE estado_ruta ADD VALUE IF NOT EXISTS 'PAGO_ATRASO_PENDIENTE';
ALTER TYPE estado_ruta ADD VALUE IF NOT EXISTS 'COMPLETADO';

-- Añadir ON DELETE CASCADE a las tablas que referencian a rutas
-- Esto permite eliminar una ruta desde el frontend sin violar las foreign keys
ALTER TABLE entregas DROP CONSTRAINT IF EXISTS entregas_ruta_id_fkey;
ALTER TABLE entregas ADD CONSTRAINT entregas_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE;

ALTER TABLE anomalias DROP CONSTRAINT IF EXISTS anomalias_ruta_id_fkey;
ALTER TABLE anomalias ADD CONSTRAINT anomalias_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE;

ALTER TABLE comprobantes_pago DROP CONSTRAINT IF EXISTS comprobantes_pago_ruta_id_fkey;
ALTER TABLE comprobantes_pago ADD CONSTRAINT comprobantes_pago_ruta_id_fkey FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE;
