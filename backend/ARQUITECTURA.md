# 🏗️ Arquitectura HU-5 / CA-2 - Diagrama y Flujo

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ⏰ CRON JOB TRIGGER                              │
│                    Todos los días a las 00:00:00                        │
│                    (Expresión: "0 0 * * *")                             │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              📍 FUNCIÓN: checkLicensesAndCreateAlerts()                 │
│           (backend/src/services/licenseAlertService.js)                 │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ↓                           ↓
    ┌──────────────────────┐     ┌──────────────────────┐
    │ 🔢 CÁLCULO FECHA:    │     │ 📝 LOGGING INICIO:  │
    │ targetDate =         │     │ Timestamp           │
    │ Today + 30 days      │     │ Expresión cron      │
    │ (Ej: 2026-05-20)     │     │ Total encontradas=0 │
    └──────────────────────┘     └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ↓
    ┌─────────────────────────────────────────────────────┐
    │ 🗂️  CONSULTA SQL (SELECT * FROM conductores WHERE:)│
    │   - licencia_vencimiento = '2026-05-20'            │
    │   - activo = true                                  │
    │   - licencia_vencimiento IS NOT NULL               │
    │                                                     │
    │ Resultado: Array de conductores                    │
    │   ├─ id (UUID)                                     │
    │   ├─ usuario_id (UUID)                             │
    │   ├─ licencia_numero (TEXT)                        │
    │   ├─ licencia_vencimiento (DATE)                   │
    │   └─ usuarios: { nombre, email }                  │
    └─────────────────────────────────────────────────────┘
                              │
                              ↓
                ┌─────────────────────────────┐
                │ ¿Hay resultados?            │
                └──────┬──────────────┬──────────┘
                       │              │
                   NO  │              │  SÍ
                       │              │
            ┌──────────▼──┐   ┌──────▼──────────────┐
            │ Log: No hay │   │ Para cada conductor│
            │ licencias   │   │ encontrado:        │
            │ vencidas    │   └──────┬─────────────┘
            └────────────┘           │
                       │             ↓
                       │  ┌────────────────────────┐
                       │  │ 🔍 ¿Alerta previa?     │
                       │  │ SELECT * FROM          │
                       │  │ incidencias WHERE:     │
                       │  │   conductor_id = [id] │
                       │  │   estado='pendiente'   │
                       │  │   descripcion LIKE     │
                       │  │   '%vencerá 30 días%'  │
                       │  └────────┬───────────────┘
                       │           │
                       │    ┌──────┴──────┐
                       │    │             │
                       │  SÍ│             │NO
                       │    │             │
                       │    ↓             ↓
                       │  ┌──┐    ┌────────────────────┐
                       │  │ ⏭️ │    │ ➕ INSERT en      │
                       │  │Sal│    │    incidencias:    │
                       │  │tar│    │                    │
                       │  └──┘    │  conductor_id:[id] │
                       │  Skipped++  tipo:'ALERTA'     │
                       │            descripcion:      │
                       │            "La licencia del  │
                       │            conductor con ID  │
                       │            [user_id] vencerá │
                       │            en 30 días."       │
                       │            estado:'pendiente' │
                       │            prioridad:'media'  │
                       │            created_at: NOW()  │
                       │    │       └─────────┬────────┘
                       │    │                 │
                       │    │       Created++ ↓
                       │    │      Log Success
                       │    │
                       └────┴───────────────┐
                                           │
                              ┌────────────▼──────────┐
                              │ ⏱️  RESUMEN FINAL:     │
                              │ Processed: N          │
                              │ Created: X            │
                              │ Skipped: Y            │
                              │ Timestamp final       │
                              └───────────────────────┘
                                           │
                                           ↓
                              ┌────────────────────────┐
                              │ 📤 RETURN RESULTADO    │
                              │ { success: true,      │
                              │   processed: N,       │
                              │   created: X,         │
                              │   skipped: Y }        │
                              └────────────────────────┘
```

---

## 🔄 Ciclo de Vida Cron

```
┌──────────────────────────────────────────────────────┐
│ INICIO DEL SERVIDOR (npm run dev)                    │
│ backend/src/server.js                               │
└──────────────┬───────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────┐
│ startLicenseAlertsCron(CRON_TIME)                   │
│ (Expresión: "0 0 * * *")                            │
└──────────────┬───────────────────────────────────────┘
               │
               ↓
    ┌──────────────────────┐
    │ Cron job ACTIVO      │
    │ Esperando...         │
    └──────────┬───────────┘
               │
       ┌───────┴────────────────────┐
       │                            │
   Cada día a las 00:00            Usuario solicita
   (trigger automático)            POST /api/license-alerts/check-now
       │                           │
       ↓                           ↓
  checkLicensesAndCreateAlerts()  checkLicensesAndCreateAlerts()
  (Automático)                    (Manual/Testing)
       │                           │
       ↓                           ↓
  [Procesa...]              [Procesa...]
  └────┬───────────────────────┬──┘
       │                       │
       └───────────┬───────────┘
                   │
             ┌─────▼──────┐
             │  RESULTADO │
             │  JSON      │
             └────────────┘
```

---

## 📊 Estructura de Datos

### INPUT: Parámetros (del .env)

```javascript
{
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiJ...",
  PORT: 3001,
  CRON_TIME: "0 0 * * *",
  NODE_ENV: "development"
}
```

### PROCESS: Consulta SQL

```sql
SELECT 
  c.id,
  c.usuario_id,
  c.licencia_numero,
  c.licencia_vencimiento,
  u.nombre,
  u.email
FROM conductores c
LEFT JOIN usuarios u ON c.usuario_id = u.id
WHERE 
  c.licencia_vencimiento = '2026-05-20'  -- TODAY + 30 DAYS
  AND c.activo = true
  AND c.licencia_vencimiento IS NOT NULL;
```

### INSERT: Alerta en BD

```sql
INSERT INTO incidencias (
  conductor_id,
  tipo,
  descripcion,
  estado,
  prioridad,
  created_at
) VALUES (
  'uuid-conductor',
  'ALERTA',
  'La licencia del conductor con ID abc123... vencerá en 30 días.',
  'pendiente',
  'media',
  '2026-04-20T00:00:00Z'
);
```

### OUTPUT: Respuesta JSON

```json
{
  "success": true,
  "processed": 5,
  "created": 3,
  "skipped": 2
}
```

---

## 🗂️ Relaciones de Tablas

```
┌─────────────────┐
│   conductores   │
├─────────────────┤
│ id (PK)         │ ◄──┐
│ usuario_id (FK) │──┐ │
│ licencia_numero │  │ │
│ licencia_    <──┼──┼─┤ MONITOREADA
│ vencimiento     │  │ │ POR CRON
│ activo          │  │ │
│ created_at      │  │ │
└─────────────────┘  │ │
                     │ │
┌─────────────────┐  │ │
│   usuarios      │  │ │
├─────────────────┤  │ │
│ id (PK)         │◄─┘ │
│ nombre          │    │
│ email           │    │
│ ...             │    │
└─────────────────┘    │
                       │
                       │ CREA ALERTA
                       │ SI VENCIMIENTO
                       │ EN 30 DÍAS
                       │
                       ↓
┌─────────────────────┐
│   incidencias       │
├─────────────────────┤
│ id (PK)             │
│ conductor_id (FK) ◄─┤
│ tipo ='ALERTA'      │
│ descripcion         │
│ estado='pendiente'   │
│ prioridad='media'    │
│ created_at          │
│ [otros campos...]   │
└─────────────────────┘
```

---

## ⏰ Timeline Ejemplo

```
2026-04-19 23:59:59  ← Sistema esperando próximo minuto

2026-04-20 00:00:00  ← ⏰ TRIGGER! Cron job ejecuta

2026-04-20 00:00:01  │ 🔍 Calcula fecha: 2026-05-20
2026-04-20 00:00:02  │ 🗂️  Consulta BD
2026-04-20 00:00:03  │ 📊 Obtiene 5 conductores
2026-04-20 00:00:04  │ ✅ Verifica duplicados
2026-04-20 00:00:05  │ ➕ Crea 3 alertas nuevas
2026-04-20 00:00:06  │ ⏭️  Salta 2 (ya existen)
2026-04-20 00:00:07  │ 📝 Genera resumen
2026-04-20 00:00:08  ← ✅ COMPLETADO

2026-04-21 00:00:00  ← ⏰ Se repite automáticamente

...

2026-05-20 [SE VENCEN LAS LICENCIAS] ← Conductor ya ha sido alertado hace 30 días
```

---

## 🔐 Flujo de Seguridad

```
┌────────────────────────────────────┐
│ Cliente/Admin solicita endpoint     │
│ POST /api/license-alerts/check-now │
└────────────┬───────────────────────┘
             │
             ↓
┌────────────────────────────────────────────┐
│ Express Server recibe solicitud            │
│ Valida método HTTP (POST)                  │
└────────────┬───────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│ Cargar credenciales de .env                         │
│ (SUPABASE_URL, SUPABASE_SERVICE_KEY)               │
│ ✅ Credenciales privadas nunca se exponen al cliente│
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│ Inicializar cliente Supabase             │
│ with Service Role Key (no User Token)    │
│ ✅ Acceso de nivel servidor              │
└────────────┬─────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────┐
│ Ejecutar operaciones SQL               │
│ ✅ Con permisos elevados                │
└────────────┬───────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────┐
│ Retornar resultado (JSON)                │
│ ✅ Sin exponer credenciales              │
└──────────────────────────────────────────┘
```

---

## 📈 Casos de Uso

### Caso 1: Ejecución Automática (Noche)

```
00:00 → Cron dispara automáticamente
00:00:05 → Se verifica si hay licencias que vencen el 20/05/2026
00:00:10 → Se crean alertas correspondientes
00:00:15 → Sistema sigue esperando...
```

### Caso 2: Verificación Manual (Testing)

```
14:30 → Admin hace: curl -X POST http://localhost:3001/api/license-alerts/check-now
14:30:02 → Se ejecuta inmediatamente la lógica
14:30:05 → Se retorna resultado
```

### Caso 3: Sin Coincidencias

```
00:00 → Cron dispara
00:00:05 → No hay licencias vencidas en 30 días
00:00:06 → Logs: "✅ No hay licencias vencidas en 30 días"
```

### Caso 4: Duplicado Prevenido

```
20/04 00:00 → Crea alerta para conductor Juan
21/04 00:00 → Verifica: ¿Ya existe alerta pendiente para Juan?
21/04 00:00 → Sí existe, salta (skipped++)
```

---

**Diagrama creado el 2026-04-19**
