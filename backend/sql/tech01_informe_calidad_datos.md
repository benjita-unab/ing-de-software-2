# TECH-01 — Informe de calidad de datos

**Proyecto:** LogiTrack  
**Base de datos:** Supabase PostgreSQL (`jmshzmwhbbufgxgxlpcd`)  
**Fecha de auditoría:** 2026-06-21  
**Estado:** Solo lectura — **no se eliminó ningún dato**

---

## 1. Resumen ejecutivo

La base contiene **datos operativos reales mezclados con semillas de desarrollo**, principalmente en la tabla `clientes`. La integridad referencial (FK huérfanas) está **correcta**: no se detectaron referencias rotas. El problema principal es **volumen de clientes basura** generados con patrones tipo Faker.js (nombres anglosajones, RUT nulo o inválido) que inflan el catálogo sin aportar valor a las pruebas de las nuevas HU.

| Área | Severidad | Hallazgo principal |
|------|-----------|-------------------|
| Clientes | **Alta** | 111/137 sin RUT; ~110 eliminables sin impacto |
| Clientes duplicados | **Media** | 4 grupos por RUT; muchos por nombre Faker |
| Conductores | **Baja** | Sin duplicados; todos sin email |
| Camiones | **Baja** | Sin duplicados; todos sin marca/modelo |
| Rutas | **Baja** | 1 ruta test/test sin dependencias |
| Usuarios prueba | **Media** | 4 detectados; 1 es demo oficial HU-27 |
| FK huérfanas | **Ninguna** | 0 registros |
| Pagos / trazabilidad | **Protegido** | 4 pagos, 60 entregas, 866 eventos GPS |

**Recomendación:** Ejecutar limpieza Tier 1 (~110 clientes + 1 ruta + 1 usuario) y planificar Tier 2 manual para clientes de prueba con rutas operativas.

---

## 2. Estructura de la base de datos

### 2.1 Tablas existentes y volumen

| Tabla | Filas | Rol |
|-------|------:|-----|
| `usuarios` | 9 | Autenticación panel / portal |
| `clientes` | 137 | Clientes B2B |
| `conductores` | 11 | Choferes |
| `camiones` | 11 | Flota |
| `rutas` | 107 | Pedidos / ejecuciones operativas |
| `rutas_paradas` | 4 | Paradas de pedido (HU-58) |
| `rutas_plantilla` | 6 | Plantillas reutilizables (HU-57) |
| `rutas_plantilla_paradas` | 10 | Paradas de plantilla |
| `entregas` | 60 | Cierre de entrega + evidencias |
| `pagos_cliente` | 4 | Cobros B2B (HU-34) |
| `historial_estados` | 181 | Auditoría cambios de estado |
| `traceability_events` | 866 | GPS / trazabilidad |
| `mensajes_conductor` | 102 | Mensajes app chofer |
| `chat_mensajes_ruta` | 6 | Chat ruta (HU-40) |
| `notificaciones_cliente` | 19 | Emails fecha estimada (HU-9) |
| `driver_licenses` | 21 | Licencias de conducir |
| `guias_despacho` | 2 | Guías portal cliente |
| `configuracion_pagos` | 1 | Config Transbank (HU-37) |
| `password_reset_tokens` | 4 | Tokens reset contraseña (HU-60) |
| `anomalias` | 1 | Alertas operativas |
| `incidencias` | 3 | Incidencias |
| `fotos` | 1 | Fotos legacy |

### 2.2 Tablas referenciadas en código pero ausentes en BD

| Tabla | Estado |
|-------|--------|
| `fotos_trazabilidad` | No existe (evidencias van en `entregas` / storage) |
| `alerts` | No existe (documentación guía, no migrada) |
| `bultos_rutas` | No existe como tabla (columnas en `rutas`/`entregas` vía migración) |

### 2.3 Diagrama de dependencias críticas

```mermaid
erDiagram
  usuarios ||--o| clientes : "usuario_id"
  usuarios ||--o| conductores : "usuario_id"
  clientes ||--{ rutas : "cliente_id"
  conductores ||--o{ rutas : "conductor_id"
  camiones ||--o{ rutas : "camion_id"
  rutas_plantilla ||--o{ rutas : "ruta_plantilla_id"
  rutas ||--{ entregas : "ruta_id"
  rutas ||--{ historial_estados : "ruta_id"
  rutas ||--{ traceability_events : "ruta_id"
  rutas ||--{ pagos_cliente : "pedido_id"
  rutas ||--{ mensajes_conductor : "ruta_id"
  clientes ||--{ pagos_cliente : "cliente_id"
  conductores ||--{ driver_licenses : "driver_id"
```

---

## 3. Hallazgos detallados

### 3.1 Clientes duplicados

#### Por RUT (violación de negocio / constraint `clientes_rut_key`)

| RUT | Cantidad | IDs | Notas |
|-----|----------|-----|-------|
| `K` | 8 | 8 UUIDs | Basura literal; sin rutas |
| `21.000.000-0` | 3 | joaquin-prueba, joacon-prueba, +1 | Pruebas manuales |
| `12345678-9` | 2 | Empresa Demo + `demo` | Demo oficial + duplicado |
| `76.000.000-k` | 2 | Soprole duplicado | Posible seed |

#### Por nombre (patrón Faker — 20+ grupos)

Ejemplos: `Tremblay - Okuneva` (×3), `Hettinger, Lueilwitz and Labadie` (×3), `Medhurst - Ankunding` (×3), `Dufour` (×3). La mayoría **no tiene rutas ni pagos**.

#### Por email

| Email | Cantidad | Notas |
|-------|----------|-------|
| `oyanadelbastian5@gmail.com` | 2 | Cliente real duplicado |

#### Campos obligatorios NULL

| Campo | Registros afectados |
|-------|--------------------:|
| `rut` | **111** (81 % del total) |
| `contacto_email` | 129 |

> La BD no exige `NOT NULL` en `rut` a nivel SQL, pero HU-06 lo define como obligatorio de negocio.

---

### 3.2 Conductores duplicados

**No se encontraron duplicados** por RUT, email ni nombre.

| Problema | Detalle |
|----------|---------|
| Email NULL | **11/11** conductores sin email |
| Usuarios vinculados | 2 conductores con usuario (`conductor1@sistema.cl`, `pedro@logistica.cl`) |

---

### 3.3 Camiones duplicados

**No se encontraron patentes duplicadas** (11 camiones únicos).

| Problema | Detalle |
|----------|---------|
| `marca` / `modelo` NULL | **11/11** |

---

### 3.4 Rutas duplicadas

No hay duplicados exactos por firma operativa completa. Se detectó **1 par** mismo cliente/origen/destino/día:

- Cliente `oyanadelbastian5@gmail.com` — La Ligua → Viña del Mar — 2026-05-26 (2 rutas)

#### Rutas con datos de prueba

| ID | Origen | Destino | Nombre | Estado | Dependencias |
|----|--------|---------|--------|--------|--------------|
| `abb6a551-…` | test | test | — | — | **Ninguna** — eliminable |
| `ff065ba2-…` | La Ligua… | Agua Santa… | Prueba 1-#58 | ASIGNADO | Pago + historial |
| `dd902c96-…` | Antofagasta… | Agua Santa… | Prueba 2 | ASIGNADO | Pago + historial |

#### Distribución por estado

| Estado | Cantidad |
|--------|----------|
| ENTREGADO | 66 |
| ASIGNADO | 39 |
| PENDIENTE | 2 |

---

### 3.5 Usuarios de prueba

| Email | Rol | Vinculado a | ¿Eliminar? |
|-------|-----|-------------|------------|
| `portal.cliente@logitrack.cl` | CLIENTE | Empresa Demo | **NO** — demo oficial HU-27 |
| `test@gmail.com` | CONDUCTOR | (huérfano) | **SÍ** — Tier 1 |
| `olmedo.ezekiel@gmail.com` | CLIENTE | EZE PRUEBA | Revisar Tier 2 |
| `entelclienteprueba@logitrack.cl` | CLIENTE | Cliente Entel | Revisar Tier 2 (1 ruta) |

Usuarios de sistema a **conservar**: `admin@sistema.cl`, `operador@logitrack.cl`, `conductor1@sistema.cl`, `pedro@logistica.cl`, `cola@gmail.com` (Empresa Loca-cola con pagos activos).

---

### 3.6 Registros huérfanos (FK inválidas)

**Resultado: 0 huérfanos** en todas las relaciones auditadas:

- `clientes.usuario_id` → `usuarios`
- `rutas` → `clientes`, `conductores`, `camiones`, `rutas_plantilla`
- `entregas` → `rutas`, `clientes`
- `pagos_cliente` → `clientes`, `pedido_id` → `rutas`
- `rutas_paradas`, `historial_estados`, `traceability_events` → `rutas`
- `rutas_plantilla_paradas` → `rutas_plantilla`

---

### 3.7 Datos de prueba / basura

#### Clientes de prueba con dependencias operativas

| Cliente | RUT | Rutas | Pagos | Usuario portal |
|---------|-----|------:|------:|----------------|
| Empresa Demo | 12345678-9 | 4 | 1 | portal.cliente@logitrack.cl |
| Bastian Prueba | 12.599.038-K | **29** | 0 | — |
| joacon-prueba | 21.000.000-0 | 3 | 0 | — |
| demo | 12345678-9 | 1 | 0 | — |
| Cliente Entel | 12.000.450-0 | 1 | 0 | entelclienteprueba@logitrack.cl |
| joaquin-prueba | 21.000.000-0 | 0 | 0 | — |
| EZE PRUEBA | 22.111.122-3 | 0 | 0 | olmedo.ezekiel@gmail.com |

#### Clientes Faker eliminables (Tier 1)

**~110 registros**: sin rutas, sin pagos, patrón Faker o RUT nulo/inválido. Representan el **80 %** del catálogo de clientes.

---

## 4. Registros que NO deben eliminarse

### 4.1 Pagos (`pagos_cliente`) — 4 registros

| ID | Cliente | Monto | Estado | pedido_id |
|----|---------|------:|--------|-----------|
| `5b3f59d9-…` | Henry | $0 | PENDIENTE | — |
| `02e9227a-…` | Empresa Demo | $10.000 | PENDIENTE | — |
| `814880d5-…` | Empresa Loca-cola | $37.680 | PENDIENTE | Prueba 2 |
| `b44713df-…` | Empresa Loca-cola | $20.693,50 | PENDIENTE | Prueba 1-#58 |

> Ningún pago está en estado `PAGADO`, pero todos son trazabilidad financiera de HU-34.

### 4.2 Entregas — 59 rutas con entrega, 60 registros

Todas las entregas tienen firma o foto. **No eliminar** rutas con fila en `entregas`.

### 4.3 Historial y trazabilidad

| Recurso | Rutas afectadas | Total registros |
|---------|----------------:|----------------:|
| `historial_estados` | 106 | 181 |
| `traceability_events` | 54 | 866 |
| `notificaciones_cliente` | varias | 19 |
| `mensajes_conductor` | varias | 102 |
| `chat_mensajes_ruta` | varias | 6 |
| `guias_despacho` | — | 2 |

### 4.4 Demo oficial HU-27

- Cliente: `99426706-6706-44aa-9954-3617b583bb0d` (Empresa Demo)
- Usuario: `portal.cliente@logitrack.cl`
- Tiene rutas y 1 pago pendiente — **mantener** para pruebas del portal cliente.

### 4.5 Configuración y licencias

- `configuracion_pagos` (1 fila) — configuración Transbank
- `driver_licenses` (21) — vinculadas a conductores reales
- Usuarios ADMIN / OPERADOR / conductores productivos

---

## 5. Propuesta segura de limpieza

### Fase 0 — Preparación

1. Backup en Supabase Dashboard.
2. Ejecutar `tech01_consultas_auditoria.sql`.
3. Ejecutar PREVIEW de `tech01_limpieza_basura.sql` (bloque `SELECT` inicial).

### Fase 1 — Tier 1 (automático, bajo riesgo)

**Eliminar ~110 clientes** que cumplen TODAS las condiciones:

- Sin rutas asociadas
- Sin pagos asociados
- No es Empresa Demo
- Y (nombre Faker / prueba / demo / RUT nulo / RUT = `K`)

**Además:**

- 1 ruta `test`/`test` (`abb6a551-…`) sin dependencias
- 1 usuario `test@gmail.com` huérfano
- Tokens `password_reset_tokens` expirados/usados

**Impacto esperado post Tier 1:**

| Tabla | Antes | Después (~) |
|-------|------:|------------:|
| clientes | 137 | ~27 |
| rutas | 107 | ~106 |
| usuarios | 9 | ~8 |

### Fase 2 — Tier 2 (revisión manual)

Evaluar caso por caso antes de borrar:

| Registro | Motivo de retención temporal |
|----------|------------------------------|
| Bastian Prueba (29 rutas) | Dataset de prueba operativa extensa; muchas con entregas/historial |
| joacon-prueba (3 rutas) | Rutas reales de desarrollo HU-58 |
| Cliente Entel + usuario | Prueba HU-60 acceso clientes |
| EZE PRUEBA + usuario | Prueba portal sin rutas — podría eliminarse si no se usa |
| cliente `demo` duplicado RUT | 1 ruta — fusionar o eliminar tras mover ruta |
| Rutas "Prueba 1/2" Loca-cola | Tienen **pagos** vinculados — no eliminar |

### Fase 3 — Tier 3 (normalización, no borrado)

1. Completar `marca`/`modelo` en camiones.
2. Completar `email` en conductores.
3. Resolver duplicado RUT `oyanadelbastian5@gmail.com` (merge manual).
4. Agregar constraint o validación app: `clientes.rut NOT NULL`.
5. Limpiar duplicado `12345678-9` (fusionar `demo` → Empresa Demo o eliminar cliente `demo`).

---

## 6. Archivos entregables

| Archivo | Descripción |
|---------|-------------|
| `backend/sql/tech01_consultas_auditoria.sql` | Consultas SELECT para cada categoría de problema |
| `backend/sql/tech01_limpieza_basura.sql` | Script DELETE Tier 1 con `ROLLBACK` por defecto |
| `backend/sql/tech01_informe_calidad_datos.md` | Este informe |
| `backend/scripts/tech01-data-quality-audit.mjs` | Script Node reproducible de auditoría |

---

## 7. Cómo reproducir la auditoría

```bash
cd backend
node scripts/tech01-data-quality-audit.mjs
node scripts/tech01-data-quality-audit-pass2.mjs
```

---

## 8. Conclusión

La base está **funcionalmente íntegra** (sin FK rotas) pero **contaminada con ~110 clientes basura** que dificultan pruebas y listados. La limpieza Tier 1 es segura y reversible con backup. Los datos operativos (entregas, pagos, GPS, historial) deben preservarse. Para las nuevas HU, se recomienda dejar como dataset de prueba controlado: **Empresa Demo** (portal), **Empresa Loca-cola** (pagos HU-34/58) y decidir si **Bastian Prueba** se conserva como sandbox o se depura en Tier 2.
