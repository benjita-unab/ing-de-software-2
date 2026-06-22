-- =============================================================================
-- TECH-01: Consultas de auditoría de calidad de datos
-- Proyecto: LogiTrack (Supabase / PostgreSQL)
-- Fecha auditoría: 2026-06-21
-- Uso: ejecutar en Supabase SQL Editor (solo lectura). No modifica datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) INVENTARIO DE TABLAS Y CONTEOS
-- -----------------------------------------------------------------------------
SELECT
  c.relname AS tabla,
  c.reltuples::bigint AS filas_estimadas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

SELECT 'usuarios' AS tabla, COUNT(*) FROM public.usuarios
UNION ALL SELECT 'clientes', COUNT(*) FROM public.clientes
UNION ALL SELECT 'conductores', COUNT(*) FROM public.conductores
UNION ALL SELECT 'camiones', COUNT(*) FROM public.camiones
UNION ALL SELECT 'rutas', COUNT(*) FROM public.rutas
UNION ALL SELECT 'rutas_paradas', COUNT(*) FROM public.rutas_paradas
UNION ALL SELECT 'rutas_plantilla', COUNT(*) FROM public.rutas_plantilla
UNION ALL SELECT 'rutas_plantilla_paradas', COUNT(*) FROM public.rutas_plantilla_paradas
UNION ALL SELECT 'entregas', COUNT(*) FROM public.entregas
UNION ALL SELECT 'pagos_cliente', COUNT(*) FROM public.pagos_cliente
UNION ALL SELECT 'historial_estados', COUNT(*) FROM public.historial_estados
UNION ALL SELECT 'traceability_events', COUNT(*) FROM public.traceability_events
UNION ALL SELECT 'mensajes_conductor', COUNT(*) FROM public.mensajes_conductor
UNION ALL SELECT 'chat_mensajes_ruta', COUNT(*) FROM public.chat_mensajes_ruta
UNION ALL SELECT 'notificaciones_cliente', COUNT(*) FROM public.notificaciones_cliente
UNION ALL SELECT 'driver_licenses', COUNT(*) FROM public.driver_licenses
UNION ALL SELECT 'guias_despacho', COUNT(*) FROM public.guias_despacho
UNION ALL SELECT 'configuracion_pagos', COUNT(*) FROM public.configuracion_pagos
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM public.password_reset_tokens
ORDER BY tabla;

-- -----------------------------------------------------------------------------
-- 1) CLIENTES DUPLICADOS
-- -----------------------------------------------------------------------------

-- 1.1 Por RUT (violación potencial de UNIQUE clientes_rut_key)
SELECT
  lower(trim(rut)) AS rut_normalizado,
  COUNT(*) AS cantidad,
  array_agg(id ORDER BY fecha_creacion NULLS LAST) AS ids
FROM public.clientes
WHERE rut IS NOT NULL AND trim(rut) <> ''
GROUP BY lower(trim(rut))
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 1.2 Por nombre (posibles seeds Faker / duplicados de desarrollo)
SELECT
  lower(trim(nombre)) AS nombre_normalizado,
  COUNT(*) AS cantidad,
  array_agg(id) AS ids
FROM public.clientes
WHERE nombre IS NOT NULL AND trim(nombre) <> ''
GROUP BY lower(trim(nombre))
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, nombre_normalizado;

-- 1.3 Por email de contacto
SELECT
  lower(trim(contacto_email)) AS email_normalizado,
  COUNT(*) AS cantidad,
  array_agg(id) AS ids
FROM public.clientes
WHERE contacto_email IS NOT NULL AND trim(contacto_email) <> ''
GROUP BY lower(trim(contacto_email))
HAVING COUNT(*) > 1;

-- 1.4 RUT inválido o basura (ej. literal "K")
SELECT id, nombre, rut, contacto_email, fecha_creacion
FROM public.clientes
WHERE rut IS NOT NULL
  AND (
    lower(trim(rut)) = 'k'
    OR length(trim(rut)) < 3
  )
ORDER BY nombre;

-- 1.5 Clientes tipo Faker (patrón de nombres generados)
SELECT id, nombre, rut, contacto_email
FROM public.clientes
WHERE nombre ~* '(, | - | inc$| llc$| and | group$)'
ORDER BY nombre;

-- 1.6 Clientes sin RUT (campo obligatorio de negocio HU-06)
SELECT COUNT(*) AS clientes_sin_rut
FROM public.clientes
WHERE rut IS NULL OR trim(rut) = '';

SELECT id, nombre, contacto_email, fecha_creacion
FROM public.clientes
WHERE rut IS NULL OR trim(rut) = ''
ORDER BY fecha_creacion DESC NULLS LAST
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 2) CONDUCTORES DUPLICADOS
-- -----------------------------------------------------------------------------

SELECT lower(trim(rut)) AS rut, COUNT(*), array_agg(id) AS ids
FROM public.conductores
WHERE rut IS NOT NULL AND trim(rut) <> ''
GROUP BY lower(trim(rut))
HAVING COUNT(*) > 1;

SELECT lower(trim(email)) AS email, COUNT(*), array_agg(id) AS ids
FROM public.conductores
WHERE email IS NOT NULL AND trim(email) <> ''
GROUP BY lower(trim(email))
HAVING COUNT(*) > 1;

SELECT lower(trim(nombre)) AS nombre, COUNT(*), array_agg(id) AS ids
FROM public.conductores
WHERE nombre IS NOT NULL
GROUP BY lower(trim(nombre))
HAVING COUNT(*) > 1;

-- Conductores sin email (dato incompleto)
SELECT id, nombre, rut, telefono
FROM public.conductores
WHERE email IS NULL OR trim(email) = '';

-- -----------------------------------------------------------------------------
-- 3) CAMIONES DUPLICADOS
-- -----------------------------------------------------------------------------

SELECT upper(replace(trim(patente), '-', '')) AS patente_norm, COUNT(*), array_agg(id) AS ids
FROM public.camiones
WHERE patente IS NOT NULL
GROUP BY upper(replace(trim(patente), '-', ''))
HAVING COUNT(*) > 1;

-- Camiones sin marca/modelo
SELECT id, patente, marca, modelo, estado
FROM public.camiones
WHERE marca IS NULL OR modelo IS NULL OR trim(marca) = '' OR trim(modelo) = '';

-- -----------------------------------------------------------------------------
-- 4) RUTAS DUPLICADAS
-- -----------------------------------------------------------------------------

-- 4.1 Misma firma operativa (cliente + origen + destino + día)
SELECT
  r.cliente_id,
  c.nombre AS cliente,
  lower(trim(r.origen)) AS origen,
  lower(trim(r.destino)) AS destino,
  date(coalesce(r.fecha_creacion, r.created_at)) AS dia,
  COUNT(*) AS cantidad,
  array_agg(r.id ORDER BY r.fecha_creacion) AS ruta_ids
FROM public.rutas r
LEFT JOIN public.clientes c ON c.id = r.cliente_id
GROUP BY r.cliente_id, c.nombre, lower(trim(r.origen)), lower(trim(r.destino)),
         date(coalesce(r.fecha_creacion, r.created_at))
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 4.2 Por nombre_ruta
SELECT lower(trim(nombre_ruta)) AS nombre, COUNT(*), array_agg(id) AS ids
FROM public.rutas
WHERE nombre_ruta IS NOT NULL AND trim(nombre_ruta) <> ''
GROUP BY lower(trim(nombre_ruta))
HAVING COUNT(*) > 1;

-- 4.3 Rutas con datos de prueba en origen/destino/nombre
SELECT id, origen, destino, nombre_ruta, estado, cliente_id
FROM public.rutas
WHERE origen ~* 'test|prueba|demo'
   OR destino ~* 'test|prueba|demo'
   OR nombre_ruta ~* 'test|prueba|demo';

-- 4.4 Distribución por estado
SELECT estado, COUNT(*) FROM public.rutas GROUP BY estado ORDER BY COUNT(*) DESC;

-- 4.5 Plantillas duplicadas
SELECT
  lower(trim(nombre)) AS nombre,
  lower(trim(origen)) AS origen,
  lower(trim(destino)) AS destino,
  COUNT(*) AS cantidad,
  array_agg(id) AS ids
FROM public.rutas_plantilla
GROUP BY lower(trim(nombre)), lower(trim(origen)), lower(trim(destino))
HAVING COUNT(*) > 1;

-- -----------------------------------------------------------------------------
-- 5) USUARIOS DE PRUEBA
-- -----------------------------------------------------------------------------

SELECT id, email, nombre, rol, activo, created_at
FROM public.usuarios
WHERE email ~* '(test@|@test\.|prueba|demo|fake|example\.com|mailinator|debug)'
   OR nombre ~* '(prueba|test|demo)';

-- Usuario demo oficial HU-27 (NO eliminar)
SELECT u.*, c.id AS cliente_id, c.nombre AS cliente_nombre
FROM public.usuarios u
LEFT JOIN public.clientes c ON c.usuario_id = u.id
WHERE u.email = 'portal.cliente@logitrack.cl';

-- Usuarios sin vínculo operativo
SELECT u.id, u.email, u.rol,
       c.id AS cliente_id,
       co.id AS conductor_id
FROM public.usuarios u
LEFT JOIN public.clientes c ON c.usuario_id = u.id
LEFT JOIN public.conductores co ON co.usuario_id = u.id
WHERE c.id IS NULL AND co.id IS NULL
  AND u.rol NOT IN ('ADMIN', 'OPERADOR');

-- -----------------------------------------------------------------------------
-- 6) CAMPOS OBLIGATORIOS NULL
-- -----------------------------------------------------------------------------

-- Clientes
SELECT 'clientes.sin_rut' AS problema, COUNT(*) FROM public.clientes WHERE rut IS NULL OR trim(rut) = ''
UNION ALL
SELECT 'clientes.sin_contacto_email', COUNT(*) FROM public.clientes WHERE contacto_email IS NULL OR trim(contacto_email) = '';

-- Conductores
SELECT id, nombre, rut, email FROM public.conductores WHERE email IS NULL OR trim(email) = '';

-- Camiones
SELECT id, patente FROM public.camiones
WHERE patente IS NULL OR trim(patente) = ''
   OR marca IS NULL OR trim(marca) = ''
   OR modelo IS NULL OR trim(modelo) = '';

-- Rutas (origen, destino, cliente_id, estado son obligatorios operativos)
SELECT id, origen, destino, cliente_id, estado
FROM public.rutas
WHERE origen IS NULL OR trim(origen) = ''
   OR destino IS NULL OR trim(destino) = ''
   OR cliente_id IS NULL
   OR estado IS NULL;

-- -----------------------------------------------------------------------------
-- 7) REGISTROS HUÉRFANOS (FK INVÁLIDAS)
-- -----------------------------------------------------------------------------

-- clientes.usuario_id → usuarios
SELECT c.id, c.nombre, c.usuario_id
FROM public.clientes c
WHERE c.usuario_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = c.usuario_id);

-- rutas → clientes, conductores, camiones, plantilla
SELECT r.id, 'cliente_id' AS fk, r.cliente_id AS fk_val
FROM public.rutas r
WHERE r.cliente_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = r.cliente_id)
UNION ALL
SELECT r.id, 'conductor_id', r.conductor_id::text
FROM public.rutas r
WHERE r.conductor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.conductores c WHERE c.id = r.conductor_id)
UNION ALL
SELECT r.id, 'camion_id', r.camion_id::text
FROM public.rutas r
WHERE r.camion_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.camiones c WHERE c.id = r.camion_id)
UNION ALL
SELECT r.id, 'ruta_plantilla_id', r.ruta_plantilla_id::text
FROM public.rutas r
WHERE r.ruta_plantilla_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rutas_plantilla p WHERE p.id = r.ruta_plantilla_id);

-- entregas → rutas / clientes
SELECT e.id, e.ruta_id
FROM public.entregas e
WHERE e.ruta_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = e.ruta_id);

SELECT e.id, e.cliente_id
FROM public.entregas e
WHERE e.cliente_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = e.cliente_id);

-- pagos_cliente → clientes / pedido (ruta)
SELECT p.id, p.cliente_id
FROM public.pagos_cliente p
WHERE NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = p.cliente_id);

SELECT p.id, p.pedido_id
FROM public.pagos_cliente p
WHERE p.pedido_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = p.pedido_id);

-- Hijos de rutas
SELECT rp.id, rp.ruta_id FROM public.rutas_paradas rp
WHERE NOT EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = rp.ruta_id);

SELECT h.id, h.ruta_id FROM public.historial_estados h
WHERE h.ruta_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = h.ruta_id);

SELECT t.id, t.ruta_id FROM public.traceability_events t
WHERE t.ruta_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rutas r WHERE r.id = t.ruta_id);

-- Licencias sin conductor
SELECT dl.id, dl.driver_id
FROM public.driver_licenses dl
WHERE dl.driver_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.conductores c WHERE c.id = dl.driver_id);

-- -----------------------------------------------------------------------------
-- 8) DATOS DE PRUEBA / BASURA (candidatos a limpieza)
-- -----------------------------------------------------------------------------

-- Clientes basura SIN rutas ni pagos (candidatos Tier 1)
WITH clientes_con_ruta AS (
  SELECT DISTINCT cliente_id AS id FROM public.rutas WHERE cliente_id IS NOT NULL
),
clientes_con_pago AS (
  SELECT DISTINCT cliente_id AS id FROM public.pagos_cliente
)
SELECT c.id, c.nombre, c.rut, c.contacto_email
FROM public.clientes c
WHERE c.id NOT IN (SELECT id FROM clientes_con_ruta)
  AND c.id NOT IN (SELECT id FROM clientes_con_pago)
  AND (
    c.nombre ~* '(prueba|test|demo|basura|fake)'
    OR c.nombre ~* '(, | - | inc$| llc$| and | group$)'
    OR lower(trim(coalesce(c.rut, ''))) = 'k'
    OR c.rut IS NULL OR trim(c.rut) = ''
  )
  AND c.id NOT IN (
    '99426706-6706-44aa-9954-3617b583bb0d'  -- Empresa Demo HU-27
  )
ORDER BY c.nombre;

-- Rutas basura sin dependencias operativas
SELECT r.id, r.origen, r.destino, r.nombre_ruta, r.estado
FROM public.rutas r
WHERE (
    r.origen ~* '^(test|prueba)$'
    OR r.destino ~* '^(test|prueba)$'
  )
  AND NOT EXISTS (SELECT 1 FROM public.entregas e WHERE e.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.historial_estados h WHERE h.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.traceability_events t WHERE t.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.pagos_cliente p WHERE p.pedido_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.mensajes_conductor m WHERE m.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.chat_mensajes_ruta ch WHERE ch.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.notificaciones_cliente n WHERE n.ruta_id = r.id);

-- -----------------------------------------------------------------------------
-- 9) REGISTROS PROTEGIDOS (NO ELIMINAR)
-- -----------------------------------------------------------------------------

-- Pagos (historial financiero)
SELECT p.*, c.nombre AS cliente
FROM public.pagos_cliente p
JOIN public.clientes c ON c.id = p.cliente_id;

-- Rutas con evidencia de entrega
SELECT DISTINCT r.id, r.origen, r.destino, r.estado
FROM public.rutas r
JOIN public.entregas e ON e.ruta_id = r.id;

-- Rutas con trazabilidad GPS
SELECT DISTINCT r.id, r.estado, COUNT(t.id) AS eventos
FROM public.rutas r
JOIN public.traceability_events t ON t.ruta_id = r.id
GROUP BY r.id, r.estado
ORDER BY eventos DESC;

-- Rutas con historial de estados
SELECT ruta_id, COUNT(*) AS cambios
FROM public.historial_estados
GROUP BY ruta_id
ORDER BY cambios DESC;

-- Tokens de reset activos
SELECT * FROM public.password_reset_tokens
WHERE usado = false AND expira_en > now();
