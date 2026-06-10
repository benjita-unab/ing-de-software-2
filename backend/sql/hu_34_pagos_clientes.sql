-- HU-34: Gestión de pagos para clientes B2B

-- Tabla principal de pagos, que agrupa despachos y totaliza el costo
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_pago TIMESTAMP WITH TIME ZONE,
    metodo_pago VARCHAR(50) DEFAULT 'MANUAL'
);

-- Agregar referencias a la tabla 'rutas' (que actúa como los despachos/pedidos)
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS pago_id UUID REFERENCES pagos(id) ON DELETE SET NULL;
ALTER TABLE rutas ADD COLUMN IF NOT EXISTS costo_servicio NUMERIC(12, 2) DEFAULT 0;

-- Crear un índice para optimizar consultas de pagos
CREATE INDEX IF NOT EXISTS idx_pagos_cliente_id ON pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_rutas_pago_id ON rutas(pago_id);
