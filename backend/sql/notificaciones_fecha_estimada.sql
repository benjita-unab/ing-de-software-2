-- HU-9: fechas estimadas de entrega y registro de notificaciones al cliente

ALTER TABLE rutas
ADD COLUMN IF NOT EXISTS fecha_estimada_inicio DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fecha_estimada_fin DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fecha_estimada_entrega DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notificacion_fecha_estimada_enviada_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notificacion_fecha_estimada_destinatario TEXT DEFAULT NULL;

COMMENT ON COLUMN rutas.fecha_estimada_inicio IS 'Inicio del rango estimado de entrega (HU-9)';
COMMENT ON COLUMN rutas.fecha_estimada_fin IS 'Fin del rango estimado de entrega (HU-9)';
COMMENT ON COLUMN rutas.fecha_estimada_entrega IS 'Día estimado de entrega dentro del rango (HU-9)';
COMMENT ON COLUMN rutas.notificacion_fecha_estimada_enviada_at IS 'Último envío exitoso de notificación de fecha estimada';
COMMENT ON COLUMN rutas.notificacion_fecha_estimada_destinatario IS 'Email del último envío exitoso de notificación de fecha estimada';

CREATE TABLE IF NOT EXISTS notificaciones_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id UUID NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  destinatario TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'FECHA_ESTIMADA_ENTREGA',
  asunto TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('enviado', 'fallido')),
  enviado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente_ruta_id
  ON notificaciones_cliente(ruta_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente_enviado_at
  ON notificaciones_cliente(enviado_at DESC);
