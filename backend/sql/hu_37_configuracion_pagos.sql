-- HU-37: tarifas de pago configurables desde el panel del operador.
-- Tabla singleton: un único registro activo (singleton_key = 'default').

CREATE TABLE IF NOT EXISTS public.configuracion_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key text NOT NULL DEFAULT 'default',
  precio_por_ruta numeric(12, 2) NOT NULL DEFAULT 10000,
  precio_por_entrega numeric(12, 2) NOT NULL DEFAULT 3000,
  precio_por_bulto numeric(12, 2) NOT NULL DEFAULT 500,
  precio_por_km numeric(12, 2) NOT NULL DEFAULT 150,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  CONSTRAINT configuracion_pagos_singleton_key_unique UNIQUE (singleton_key),
  CONSTRAINT configuracion_pagos_precio_por_ruta_nonneg CHECK (precio_por_ruta >= 0),
  CONSTRAINT configuracion_pagos_precio_por_entrega_nonneg CHECK (precio_por_entrega >= 0),
  CONSTRAINT configuracion_pagos_precio_por_bulto_nonneg CHECK (precio_por_bulto >= 0),
  CONSTRAINT configuracion_pagos_precio_por_km_nonneg CHECK (precio_por_km >= 0)
);

COMMENT ON TABLE public.configuracion_pagos IS
  'Tarifas unitarias HU-37 para cálculo de pago a conductores (registro singleton).';

INSERT INTO public.configuracion_pagos (singleton_key)
VALUES ('default')
ON CONFLICT (singleton_key) DO NOTHING;
