-- =============================================================================
-- TECH-01: Limpieza de datos basura (SOLO desarrollo / staging)
-- =============================================================================
-- ⚠️  NO EJECUTAR EN PRODUCCIÓN SIN REVISIÓN MANUAL
-- ⚠️  Este script NO se ha ejecutado aún (auditoría 2026-06-21)
--
-- Alcance: elimina únicamente registros identificados como basura de desarrollo
--          sin dependencias de pagos, entregas, historial, trazabilidad ni chat.
--
-- Exclusiones explícitas (Tier 2 — pruebas manuales):
--   EZE PRUEBA      1f57a25d-1549-4bc2-86ea-5f984f753bb9
--   joaquin-prueba  d7401f26-05ad-4192-8736-e8230db07875
--
-- Pasos recomendados:
--   1. Ejecutar tech01_consultas_auditoria.sql y revisar resultados
--   2. Ejecutar SOLO los SELECT de "PREVIEW" de este archivo
--   3. Hacer backup (Supabase Dashboard → Database → Backups)
--   4. Cambiar ROLLBACK por COMMIT al final si los conteos son correctos
--   5. Ejecutar el bloque BEGIN…ROLLBACK (o COMMIT tras validar)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- PREVIEW: conteos antes de borrar
-- Esperado: clientes=110, rutas=1, usuarios=1, tokens=4
-- ---------------------------------------------------------------------------
WITH clientes_con_ruta AS (
  SELECT DISTINCT cliente_id AS id FROM public.rutas WHERE cliente_id IS NOT NULL
),
clientes_con_pago AS (
  SELECT DISTINCT cliente_id AS id FROM public.pagos_cliente
),
clientes_basura AS (
  SELECT c.id
  FROM public.clientes c
  WHERE c.id NOT IN (SELECT id FROM clientes_con_ruta)
    AND c.id NOT IN (SELECT id FROM clientes_con_pago)
    AND c.id NOT IN (
      '99426706-6706-44aa-9954-3617b583bb0d',  -- Empresa Demo (portal HU-27)
      '1f57a25d-1549-4bc2-86ea-5f984f753bb9',  -- EZE PRUEBA (Tier 2)
      'd7401f26-05ad-4192-8736-e8230db07875'   -- joaquin-prueba (Tier 2)
    )
    AND (
      c.nombre ~* '(prueba|test|demo|basura|fake)'
      OR c.nombre ~* '(, | - | inc$| llc$| and | group$)'
      OR lower(trim(coalesce(c.rut, ''))) = 'k'
      OR c.rut IS NULL OR trim(c.rut) = ''
    )
),
rutas_basura AS (
  SELECT r.id
  FROM public.rutas r
  WHERE lower(trim(r.origen)) = 'test'
    AND lower(trim(r.destino)) = 'test'
    AND NOT EXISTS (SELECT 1 FROM public.entregas e WHERE e.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.historial_estados h WHERE h.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.traceability_events t WHERE t.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.pagos_cliente p WHERE p.pedido_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.mensajes_conductor m WHERE m.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.chat_mensajes_ruta ch WHERE ch.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.notificaciones_cliente n WHERE n.ruta_id = r.id)
),
usuarios_basura AS (
  SELECT u.id
  FROM public.usuarios u
  WHERE u.email = 'test@gmail.com'
    AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.usuario_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.conductores co WHERE co.usuario_id = u.id)
),
tokens_basura AS (
  SELECT t.id
  FROM public.password_reset_tokens t
  WHERE t.used_at IS NOT NULL
     OR t.expires_at < now()
)
SELECT
  (SELECT COUNT(*) FROM clientes_basura) AS clientes_a_eliminar,
  (SELECT COUNT(*) FROM rutas_basura) AS rutas_a_eliminar,
  (SELECT COUNT(*) FROM usuarios_basura) AS usuarios_a_eliminar,
  (SELECT COUNT(*) FROM tokens_basura) AS tokens_a_eliminar;

-- ---------------------------------------------------------------------------
-- PREVIEW: listado detallado (ejecutar aparte si se desea)
-- ---------------------------------------------------------------------------
-- SELECT c.id, c.nombre, c.rut FROM clientes_basura c ORDER BY c.nombre;
-- SELECT * FROM rutas_basura;
-- SELECT * FROM usuarios_basura;
-- SELECT * FROM tokens_basura;

-- ---------------------------------------------------------------------------
-- A) Eliminar rutas basura (sin hijos operativos)
-- ID conocido: abb6a551-a8c6-4fc6-8baa-234a0074deee (origen=test, destino=test)
-- ---------------------------------------------------------------------------
DELETE FROM public.rutas_paradas rp
WHERE rp.ruta_id IN (
  SELECT r.id FROM public.rutas r
  WHERE lower(trim(r.origen)) = 'test' AND lower(trim(r.destino)) = 'test'
    AND NOT EXISTS (SELECT 1 FROM public.entregas e WHERE e.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.historial_estados h WHERE h.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.traceability_events t WHERE t.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.pagos_cliente p WHERE p.pedido_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.mensajes_conductor m WHERE m.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.chat_mensajes_ruta ch WHERE ch.ruta_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.notificaciones_cliente n WHERE n.ruta_id = r.id)
);

DELETE FROM public.rutas r
WHERE lower(trim(r.origen)) = 'test' AND lower(trim(r.destino)) = 'test'
  AND NOT EXISTS (SELECT 1 FROM public.entregas e WHERE e.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.historial_estados h WHERE h.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.traceability_events t WHERE t.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.pagos_cliente p WHERE p.pedido_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.mensajes_conductor m WHERE m.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.chat_mensajes_ruta ch WHERE ch.ruta_id = r.id)
  AND NOT EXISTS (SELECT 1 FROM public.notificaciones_cliente n WHERE n.ruta_id = r.id);

-- ---------------------------------------------------------------------------
-- B) Eliminar clientes basura Tier 1 (110 registros Faker / sin RUT / sin rutas)
-- Excluye Empresa Demo, EZE PRUEBA, joaquin-prueba y clientes con pagos o rutas
-- ---------------------------------------------------------------------------
DELETE FROM public.clientes c
WHERE c.id NOT IN (
    SELECT DISTINCT cliente_id FROM public.rutas WHERE cliente_id IS NOT NULL
  )
  AND c.id NOT IN (
    SELECT DISTINCT cliente_id FROM public.pagos_cliente
  )
  AND c.id NOT IN (
    '99426706-6706-44aa-9954-3617b583bb0d',  -- Empresa Demo HU-27
    '1f57a25d-1549-4bc2-86ea-5f984f753bb9',  -- EZE PRUEBA (Tier 2)
    'd7401f26-05ad-4192-8736-e8230db07875'   -- joaquin-prueba (Tier 2)
  )
  AND (
    c.nombre ~* '(prueba|test|demo|basura|fake)'
    OR c.nombre ~* '(, | - | inc$| llc$| and | group$)'
    OR lower(trim(coalesce(c.rut, ''))) = 'k'
    OR c.rut IS NULL OR trim(c.rut) = ''
  );

-- ---------------------------------------------------------------------------
-- C) Usuario huérfano de prueba (sin cliente ni conductor vinculado)
-- ---------------------------------------------------------------------------
DELETE FROM public.usuarios u
WHERE u.email = 'test@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.usuario_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.conductores co WHERE co.usuario_id = u.id);

-- ---------------------------------------------------------------------------
-- D) Tokens de reset expirados o ya utilizados (HU-60)
-- ---------------------------------------------------------------------------
DELETE FROM public.password_reset_tokens
WHERE used_at IS NOT NULL
   OR expires_at < now();

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POST-LIMPIEZA
-- ---------------------------------------------------------------------------
SELECT 'clientes' AS tabla, COUNT(*) FROM public.clientes
UNION ALL SELECT 'rutas', COUNT(*) FROM public.rutas
UNION ALL SELECT 'usuarios', COUNT(*) FROM public.usuarios
UNION ALL SELECT 'pagos_cliente', COUNT(*) FROM public.pagos_cliente
UNION ALL SELECT 'entregas', COUNT(*) FROM public.entregas
UNION ALL SELECT 'traceability_events', COUNT(*) FROM public.traceability_events
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM public.password_reset_tokens;

-- Cambiar ROLLBACK por COMMIT tras validar conteos
ROLLBACK;
-- COMMIT;
