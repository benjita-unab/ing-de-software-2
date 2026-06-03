-- =============================================================================
-- HU-27: validación post-migración (ejecutar después de hu_27_portal_cliente.sql)
-- =============================================================================

-- 1) Enum CLIENTE existe
SELECT e.enumlabel AS user_role_value
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- 2) Columna y FK
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'clientes'
  AND c.column_name = 'usuario_id';

SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
WHERE con.conrelid = 'public.clientes'::regclass
  AND con.conname = 'clientes_usuario_id_fkey';

-- 3) Índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'clientes_usuario_id_unique',
    'idx_clientes_usuario_id',
    'idx_rutas_cliente_id'
  )
ORDER BY indexname;

-- 4) Usuario de prueba y vínculo
SELECT
  u.id AS usuario_id,
  u.email,
  u.rol,
  u.activo,
  c.id AS cliente_id,
  c.nombre AS cliente_nombre,
  c.usuario_id AS cliente_usuario_id_fk
FROM public.usuarios u
LEFT JOIN public.clientes c ON c.usuario_id = u.id
WHERE u.email = 'portal.cliente@logitrack.cl';

-- 5) Integridad: ningún usuario_id huérfano
SELECT c.id, c.nombre, c.usuario_id
FROM public.clientes c
WHERE c.usuario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id = c.usuario_id
  );

-- 6) Integridad: un usuario no enlazado a dos clientes
SELECT usuario_id, COUNT(*) AS num_clientes
FROM public.clientes
WHERE usuario_id IS NOT NULL
GROUP BY usuario_id
HAVING COUNT(*) > 1;

-- 7) Pedidos visibles para el cliente demo
SELECT COUNT(*) AS rutas_empresa_demo
FROM public.rutas r
JOIN public.clientes c ON c.id = r.cliente_id
JOIN public.usuarios u ON u.id = c.usuario_id
WHERE u.email = 'portal.cliente@logitrack.cl';
