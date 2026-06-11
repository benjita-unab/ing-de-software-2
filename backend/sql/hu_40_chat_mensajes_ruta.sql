-- HU-40 Fase 3: Chat operador ↔ conductor por ruta
-- Tabla independiente de mensajes_conductor (alertas/estados).

CREATE TABLE IF NOT EXISTS chat_mensajes_ruta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ruta_id uuid NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
  remitente_tipo text NOT NULL CHECK (remitente_tipo IN ('OPERADOR', 'CONDUCTOR')),
  remitente_id uuid NOT NULL,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  leido_at timestamptz
);

CREATE INDEX IF NOT EXISTS chat_mensajes_ruta_ruta_id_idx
  ON chat_mensajes_ruta (ruta_id);

CREATE INDEX IF NOT EXISTS chat_mensajes_ruta_created_at_idx
  ON chat_mensajes_ruta (ruta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_mensajes_ruta_no_leidos_idx
  ON chat_mensajes_ruta (ruta_id, remitente_tipo)
  WHERE leido_at IS NULL;
