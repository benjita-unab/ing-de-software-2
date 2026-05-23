-- HU-06: Administración de clientes B2B

-- Garantizamos que si no hay constraints de unique rut se agregue.
-- Esta restricción ayuda a cumplir el CA-4 a nivel de base de datos.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'clientes_rut_key'
    ) THEN
        ALTER TABLE clientes ADD CONSTRAINT clientes_rut_key UNIQUE (rut);
    END IF;
END $$;

-- Asegurar que la tabla entregas tenga cliente_id o similar si es necesario
-- (Solo ilustrativo o preparativo para relacionar despacho con cliente B2B)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'entregas' 
        AND column_name = 'cliente_id'
    ) THEN
        ALTER TABLE entregas ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
    END IF;
END $$;
