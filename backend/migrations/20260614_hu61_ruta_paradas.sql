-- ============================================================
-- HU-61: Gestión de Paradas — Migración ADITIVA (Zero Breaking Change)
-- ============================================================
-- IMPORTANTE: Este script NO modifica ninguna tabla existente.
-- Solo agrega la nueva tabla `ruta_paradas` relacionada con `rutas`.
-- Las columnas `rutas.origen`, `rutas.destino`, `rutas.distancia_km`
-- y `rutas.eta` se mantienen intactas para compatibilidad hacia atrás.
-- ============================================================

-- 1. NUEVA TABLA: ruta_paradas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_paradas (
  id                          uuid        NOT NULL DEFAULT uuid_generate_v4(),

  -- Relación con ruta existente (ON DELETE CASCADE: si se elimina la ruta, se eliminan sus paradas)
  ruta_id                     uuid        NOT NULL,

  -- Posición dentro de la secuencia de la ruta (1 = primera parada intermedia)
  orden                       integer     NOT NULL,

  -- Dirección legible de la parada
  direccion                   text        NOT NULL,

  -- Coordenadas opcionales para el mapa
  lat                         numeric     NULL,
  lng                         numeric     NULL,

  -- Tipo de parada: ENTREGA | RECOLECCION | DESCANSO
  tipo_parada                 text        NOT NULL DEFAULT 'ENTREGA',

  -- Estado operativo de la parada
  estado                      text        NOT NULL DEFAULT 'PENDIENTE',
  -- Valores de estado: PENDIENTE | EN_CAMINO | COMPLETADO | OMITIDO

  -- ETA individual para esta parada (calculado en Task #523)
  eta                         timestamp without time zone NULL,

  -- Distancia desde la parada anterior (o desde origen para la primera)
  distancia_desde_anterior_km numeric     NULL,

  created_at                  timestamp without time zone NOT NULL DEFAULT now(),

  CONSTRAINT ruta_paradas_pkey PRIMARY KEY (id),
  CONSTRAINT ruta_paradas_ruta_id_fkey
    FOREIGN KEY (ruta_id)
    REFERENCES public.rutas(id)
    ON DELETE CASCADE,

  CONSTRAINT ruta_paradas_tipo_parada_check
    CHECK (tipo_parada IN ('ENTREGA', 'RECOLECCION', 'DESCANSO')),

  CONSTRAINT ruta_paradas_estado_check
    CHECK (estado IN ('PENDIENTE', 'EN_CAMINO', 'COMPLETADO', 'OMITIDO')),

  -- Cada parada debe tener un orden único dentro de su ruta
  CONSTRAINT ruta_paradas_ruta_orden_unique UNIQUE (ruta_id, orden)
);

-- 2. ÍNDICES DE RENDIMIENTO
-- ─────────────────────────────────────────────────────────────
-- Acelera consultas de paradas por ruta (el caso de uso más frecuente)
CREATE INDEX IF NOT EXISTS idx_ruta_paradas_ruta_id
  ON public.ruta_paradas (ruta_id);

-- Acelera el ordenamiento por ruta + orden
CREATE INDEX IF NOT EXISTS idx_ruta_paradas_ruta_orden
  ON public.ruta_paradas (ruta_id, orden ASC);

-- 3. COMENTARIOS DE DOCUMENTACIÓN
-- ─────────────────────────────────────────────────────────────
COMMENT ON TABLE public.ruta_paradas IS
  'HU-61: Paradas intermedias de una ruta. Tabla aditiva — no modifica rutas existentes.';

COMMENT ON COLUMN public.ruta_paradas.orden IS
  'Posición secuencial dentro de la ruta. 1 = primera parada tras el origen.';

COMMENT ON COLUMN public.ruta_paradas.distancia_desde_anterior_km IS
  'Distancia vial calculada desde el punto anterior (origen o parada previa). Task #523.';

-- ============================================================
-- VERIFICACIÓN (ejecutar después de la migración)
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'ruta_paradas' ORDER BY ordinal_position;
