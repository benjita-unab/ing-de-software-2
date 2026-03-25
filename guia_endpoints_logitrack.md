# 📡 Guía de Endpoints — LogiTrack + Supabase

> **Contexto:** LogiTrack usa **Supabase** como backend. Esto significa que **ya tienes endpoints REST disponibles automáticamente** a través de **PostgREST**, sin necesidad de crear un servidor Express/FastAPI/etc. Esta guía explica cómo usarlos y cómo crear lógica adicional con **Edge Functions**.

---

## 1. ¿Cómo funciona el backend de Supabase?

```
Frontend React ──► PostgREST API (auto-generada) ──► PostgreSQL
                  (https://<proyecto>.supabase.co/rest/v1/)

Frontend React ──► Edge Functions ──► Lógica personalizada
                  (https://<proyecto>.supabase.co/functions/v1/)

Frontend React ──► Realtime WS ──► Cambios en tiempo real
```

**Tu proyecto:** `https://jmshzmwhbbufgxgxlpcd.supabase.co`

---

## 2. Schema mínimo: tabla `alerts`

Antes de usar los endpoints, asegúrate de que la tabla exista en Supabase. Corre esto en el **SQL Editor** del dashboard:

```sql
CREATE TABLE IF NOT EXISTS public.alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type       TEXT NOT NULL,           -- 'DESVIO_RUTA' | 'BOTON_PANICO' | 'ANOMALIA' | 'MANTENCION'
  priority         TEXT NOT NULL,           -- 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAJA'
  status           TEXT NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE' | 'EN_GESTION' | 'RESUELTA'
  driver_name      TEXT,
  vehicle_plate    TEXT,
  description      TEXT,
  lat              FLOAT,
  lng              FLOAT,
  last_location_label TEXT,
  acknowledged_by  TEXT,
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Política para la clave anon (lectura y escritura con anon key)
CREATE POLICY "Acceso anon total" ON public.alerts
  FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

---

## 3. Endpoints REST automáticos (PostgREST)

### Headers requeridos en TODAS las llamadas

```
apikey: <REACT_APP_SUPABASE_ANON_KEY>
Authorization: Bearer <REACT_APP_SUPABASE_ANON_KEY>
Content-Type: application/json
```

**URL base:** `https://jmshzmwhbbufgxgxlpcd.supabase.co/rest/v1`

---

### 3.1 — GET /alerts — Listar alertas activas

Trae todas las alertas con estado `PENDIENTE` o `EN_GESTION`, ordenadas por fecha.

```http
GET /rest/v1/alerts?status=in.("PENDIENTE","EN_GESTION")&order=created_at.desc
```

**Ejemplo con `curl`:**
```bash
curl "https://jmshzmwhbbufgxgxlpcd.supabase.co/rest/v1/alerts?status=in.(PENDIENTE,EN_GESTION)&order=created_at.desc" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

**Cómo lo usa el frontend ([useAlerts.js](file:///c:/Users/benja/Downloads/files/useAlerts.js) línea 33-37):**
```js
const { data, error } = await supabase
  .from("alerts")
  .select("*")
  .in("status", ["PENDIENTE", "EN_GESTION"])
  .order("created_at", { ascending: false });
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "BOTON_PANICO",
    "priority": "CRITICA",
    "status": "PENDIENTE",
    "driver_name": "Carlos Pérez",
    "vehicle_plate": "ABCD-12",
    "description": "El conductor presionó el botón de pánico.",
    "lat": -33.4489,
    "lng": -70.6693,
    "last_location_label": "Av. Providencia 1234, Santiago",
    "acknowledged_by": null,
    "acknowledged_at": null,
    "resolved_at": null,
    "created_at": "2026-03-24T10:00:00Z"
  }
]
```

---

### 3.2 — GET /alerts/:id — Obtener una alerta por ID

```http
GET /rest/v1/alerts?id=eq.<UUID>
```

**Ejemplo:**
```bash
curl "https://jmshzmwhbbufgxgxlpcd.supabase.co/rest/v1/alerts?id=eq.550e8400-e29b-41d4-a716-446655440000" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

**Cómo usarlo en React:**
```js
const { data } = await supabase
  .from("alerts")
  .select("*")
  .eq("id", alertId)
  .single();
```

---

### 3.3 — POST /alerts — Crear una alerta nueva

```http
POST /rest/v1/alerts
Content-Type: application/json

{
  "alert_type": "DESVIO_RUTA",
  "priority": "ALTA",
  "status": "PENDIENTE",
  "driver_name": "María López",
  "vehicle_plate": "XY-1234",
  "description": "El vehículo se desvió de la ruta programada.",
  "lat": -33.4500,
  "lng": -70.6700,
  "last_location_label": "Ruta 68, km 45"
}
```

**Ejemplo con `curl`:**
```bash
curl -X POST "https://jmshzmwhbbufgxgxlpcd.supabase.co/rest/v1/alerts" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"alert_type":"DESVIO_RUTA","priority":"ALTA","status":"PENDIENTE","driver_name":"María López","vehicle_plate":"XY-1234"}'
```

**Cómo usarlo en React:**
```js
const { data, error } = await supabase
  .from("alerts")
  .insert({
    alert_type: "DESVIO_RUTA",
    priority: "ALTA",
    status: "PENDIENTE",
    driver_name: "María López",
    vehicle_plate: "XY-1234",
  })
  .select()
  .single();
```

**Respuesta exitosa (201):** Retorna el objeto insertado con su `id` y `created_at`.

---

### 3.4 — PATCH /alerts/:id — Acuse de Recibo (EN_GESTION)

Cambia el estado a `EN_GESTION` y registra quién acusó recibo. Equivalente a `acknowledgeAlert()` en [useAlerts.js](file:///c:/Users/benja/Downloads/files/useAlerts.js).

```http
PATCH /rest/v1/alerts?id=eq.<UUID>
Content-Type: application/json

{
  "status": "EN_GESTION",
  "acknowledged_by": "op_benja_01",
  "acknowledged_at": "2026-03-24T10:05:00Z"
}
```

**Ejemplo con `curl`:**
```bash
curl -X PATCH "https://jmshzmwhbbufgxgxlpcd.supabase.co/rest/v1/alerts?id=eq.550e8400-e29b-41d4-a716-446655440000" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"status":"EN_GESTION","acknowledged_by":"op_benja_01","acknowledged_at":"2026-03-24T10:05:00Z"}'
```

**Cómo lo usa el frontend ([useAlerts.js](file:///c:/Users/benja/Downloads/files/useAlerts.js) línea 104-120):**
```js
const { error } = await supabase
  .from("alerts")
  .update({
    status: "EN_GESTION",
    acknowledged_by: operatorId,
    acknowledged_at: new Date().toISOString(),
  })
  .eq("id", alertId);
```

**Respuesta exitosa (204):** Sin cuerpo. El cambio se propaga automáticamente por Realtime.

---

### 3.5 — PATCH /alerts/:id — Marcar como Resuelta

```http
PATCH /rest/v1/alerts?id=eq.<UUID>
Content-Type: application/json

{
  "status": "RESUELTA",
  "resolved_at": "2026-03-24T10:30:00Z"
}
```

**Cómo lo usa el frontend ([useAlerts.js](file:///c:/Users/benja/Downloads/files/useAlerts.js) línea 123-134):**
```js
const { error } = await supabase
  .from("alerts")
  .update({ status: "RESUELTA", resolved_at: new Date().toISOString() })
  .eq("id", alertId);
```

**Respuesta exitosa (204):** Sin cuerpo.

---

### 3.6 — DELETE /alerts/:id — Eliminar una alerta

> [!WARNING]
> En producción se recomienda NO borrar alertas; usar `status: "RESUELTA"` mejor.

```http
DELETE /rest/v1/alerts?id=eq.<UUID>
```

**Cómo usarlo en React:**
```js
const { error } = await supabase
  .from("alerts")
  .delete()
  .eq("id", alertId);
```

---

## 4. Filtros útiles de PostgREST

| Filtro              | Equivalente SQL        | Ejemplo en URL                        |
|---------------------|------------------------|---------------------------------------|
| `eq.<valor>`        | `= 'valor'`            | `?priority=eq.CRITICA`                |
| `in.(<v1>,<v2>)`   | `IN ('v1','v2')`       | `?status=in.(PENDIENTE,EN_GESTION)`   |
| `gte.<valor>`       | `>= 'valor'`           | `?created_at=gte.2026-03-01`          |
| `order=campo.desc` | `ORDER BY campo DESC`  | `?order=created_at.desc`              |
| `limit=<n>`         | `LIMIT n`              | `?limit=50`                           |
| `select=col1,col2` | `SELECT col1, col2`    | `?select=id,alert_type,priority`      |

---

## 5. Edge Functions — Lógica personalizada

Las **Edge Functions** son funciones serverless en Deno que corren en Supabase. Úsalas cuando necesites lógica que no debe estar en el frontend (validaciones críticas, notificaciones externas, etc.).

### 5.1 — Instalación del CLI de Supabase

```bash
npx supabase login
npx supabase init       # solo si no existe supabase/
```

### 5.2 — Crear una Edge Function: `acknowledge-alert`

```bash
npx supabase functions new acknowledge-alert
```

Esto crea `supabase/functions/acknowledge-alert/index.ts`. Reemplaza su contenido:

```typescript
// supabase/functions/acknowledge-alert/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      },
    });
  }

  const { alertId, operatorId } = await req.json();

  if (!alertId || !operatorId) {
    return new Response(
      JSON.stringify({ error: "alertId y operatorId son requeridos" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // usa service_role en Edge Functions
  );

  const { error } = await supabase
    .from("alerts")
    .update({
      status: "EN_GESTION",
      acknowledged_by: operatorId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .eq("status", "PENDIENTE"); // solo si está PENDIENTE

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
```

### 5.3 — Desplegar la Edge Function

```bash
npx supabase functions deploy acknowledge-alert --project-ref jmshzmwhbbufgxgxlpcd
```

### 5.4 — Llamar la Edge Function desde React

```js
// Opción A: con el cliente supabase
const { data, error } = await supabase.functions.invoke("acknowledge-alert", {
  body: { alertId: "550e8400...", operatorId: "op_benja_01" },
});

// Opción B: con fetch directo
const res = await fetch(
  "https://jmshzmwhbbufgxgxlpcd.supabase.co/functions/v1/acknowledge-alert",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ alertId, operatorId }),
  }
);
const result = await res.json();
```

---

## 6. Probar los endpoints sin código

Puedes usar cualquiera de estas herramientas para probar los endpoints antes de integrarlos:

| Herramienta    | Cómo usarla                                              |
|----------------|----------------------------------------------------------|
| **curl**       | Ejemplos incluidos en cada sección arriba                |
| **Postman**    | Importa la URL base y agrega los headers de la sección 3 |
| **Insomnia**   | Igual que Postman                                        |
| **Dashboard**  | Supabase → Table Editor → filtra alertas directamente    |
| **SQL Editor** | Supabase → SQL Editor → `SELECT * FROM alerts;`         |

---

## 7. Resumen de endpoints

| Método   | Endpoint (PostgREST)                                        | Acción                        |
|----------|-------------------------------------------------------------|-------------------------------|
| `GET`    | `/rest/v1/alerts?status=in.(PENDIENTE,EN_GESTION)`          | Listar alertas activas        |
| `GET`    | `/rest/v1/alerts?id=eq.<UUID>`                              | Obtener alerta por ID         |
| `POST`   | `/rest/v1/alerts`                                           | Crear nueva alerta            |
| `PATCH`  | `/rest/v1/alerts?id=eq.<UUID>` → `{status: "EN_GESTION"}`  | Acuse de recibo               |
| `PATCH`  | `/rest/v1/alerts?id=eq.<UUID>` → `{status: "RESUELTA"}`    | Marcar como resuelta          |
| `DELETE` | `/rest/v1/alerts?id=eq.<UUID>`                              | Eliminar alerta               |
| `POST`   | `/functions/v1/acknowledge-alert`                           | Edge Fn: acuse con validación |

> [!NOTE]
> El frontend LogiTrack ya consume todos estos endpoints a través del cliente `supabase-js`. Los endpoints REST son útiles para integraciones externas (sistemas GPS, dispositivos IoT, simuladores de alertas, etc).
