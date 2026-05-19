-- SQL para HU-9: Comunicación Jerárquica por Colas

CREATE TABLE IF NOT EXISTS mensajes_conductor (
  id uuid PRIMARY KEY,
  ruta_id uuid NOT NULL REFERENCES rutas(id),
  mensaje text NOT NULL,
  tipo text NOT NULL DEFAULT 'ESTADO',
  prioridad text NOT NULL DEFAULT 'NORMAL',
  latitud double precision,
  longitud double precision,
  timestamp_evento timestamptz NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mensajes_conductor_ruta_id_idx
  ON mensajes_conductor (ruta_id);

CREATE INDEX IF NOT EXISTS mensajes_conductor_prioridad_idx
  ON mensajes_conductor (prioridad);
