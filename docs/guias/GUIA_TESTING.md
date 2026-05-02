# 🧪 Guía de Testing - Endpoints Backend

## 📌 Herramientas

- **curl** - Línea de comandos (ejemplos incluidos)
- **Postman** - UI gráfica
- **Insomnia** - Alternativa a Postman
- **Thunder Client** - VS Code extension

---

## 🔐 Obtener JWT de Prueba

### Opción 1: Desde el Frontend (Recomendado)

```javascript
// En la consola del navegador, con usuario autenticado
const session = await supabase.auth.getSession();
const token = session.data.session.access_token;
console.log(token);  // Copia este valor
```

### Opción 2: Via Supabase API

```bash
curl -X POST https://jmshzmwhbbufgxgxlpcd.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu@email.com",
    "password": "tu_password"
  }'
```

---

## 1️⃣ HEALTH CHECK

### Verificar que el backend está activo

```bash
curl http://localhost:3000/health
```

**Respuesta esperada (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

## 2️⃣ CONDUCTORES - Endpoints

### 2.1 Subir Licencia

```bash
# Setup
TOKEN="eyJhbGc..."  # Tu JWT aquí
FILE="./licencia.pdf"
EXPIRY_DATE="2025-12-31"

# Ejecutar
curl -X POST http://localhost:3000/api/conductores/upload-license \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE" \
  -F "expiryDate=$EXPIRY_DATE"
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Licencia subida exitosamente",
  "data": {
    "licenseId": "550e8400-e29b-41d4-a716-446655440000",
    "fileUrl": "https://xxx.supabasecdn.co/licenses/...",
    "status": "pending_review",
    "expiryDate": "2025-12-31"
  }
}
```

### 2.2 Validar Estado de Licencia

```bash
TOKEN="eyJhbGc..."
CONDUCTOR_ID="550e8400-e29b-41d4-a716-446655440001"

curl http://localhost:3000/api/conductores/$CONDUCTOR_ID/license-status \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200) - Licencia Válida:**
```json
{
  "isValid": true,
  "status": "VALID",
  "message": "Licencia vigente",
  "expiryDate": "2025-12-31",
  "daysUntilExpiry": 320
}
```

**Respuesta (200) - Licencia Vencida:**
```json
{
  "isValid": false,
  "status": "EXPIRED",
  "message": "La licencia del conductor se encuentra vencida",
  "expiryDate": "2023-12-31"
}
```

### 2.3 Obtener Info del Conductor

```bash
TOKEN="eyJhbGc..."
CONDUCTOR_ID="550e8400-e29b-41d4-a716-446655440001"

curl http://localhost:3000/api/conductores/$CONDUCTOR_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200):**
```json
{
  "conductor": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "usuario_id": "550e8400-e29b-41d4-a716-446655440002",
    "rut": "12.345.678-9",
    "licencia_numero": "LIC123456",
    "licencia_vencimiento": "2025-12-31",
    "telefono": "+56912345678",
    "activo": true
  },
  "licenses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "file_url": "https://xxx.supabasecdn.co/...",
      "file_name": "licencia.pdf",
      "expiry_date": "2025-12-31",
      "status": "pending_review",
      "uploaded_at": "2024-01-15T10:00:00Z"
    }
  ],
  "licenseStatus": {
    "isValid": true,
    "status": "VALID",
    "message": "Licencia vigente",
    "daysUntilExpiry": 320
  }
}
```

### 2.4 Listar Todos los Conductores

```bash
TOKEN="eyJhbGc..."

curl http://localhost:3000/api/conductores \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "rut": "12.345.678-9",
    "licencia_numero": "LIC123456",
    "licencia_vencimiento": "2025-12-31",
    "telefono": "+56912345678",
    "activo": true,
    "licenseStatus": {
      "isValid": true,
      "status": "VALID"
    }
  },
  // ... más conductores
]
```

---

## 3️⃣ RUTAS - Endpoints

### 3.1 Asignar Conductor a Ruta

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"
CONDUCTOR_ID="550e8400-e29b-41d4-a716-446655440001"
CAMION_ID="550e8400-e29b-41d4-a716-446655440020"
CARGA_KG=1000

curl -X POST http://localhost:3000/api/rutas/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rutaId": "'$RUTA_ID'",
    "conductorId": "'$CONDUCTOR_ID'",
    "camionId": "'$CAMION_ID'",
    "cargaRequeridaKg": '$CARGA_KG'
  }'
```

**Respuesta (201) - Éxito:**
```json
{
  "success": true,
  "message": "Conductor asignado a la ruta exitosamente",
  "data": {
    "rutaId": "550e8400-e29b-41d4-a716-446655440010",
    "conductorId": "550e8400-e29b-41d4-a716-446655440001",
    "camionId": "550e8400-e29b-41d4-a716-446655440020",
    "estado": "ASIGNADA"
  }
}
```

**Respuesta (403) - Licencia Vencida:**
```json
{
  "statusCode": 403,
  "message": "No se puede asignar ruta: La licencia del conductor se encuentra vencida",
  "error": "Forbidden"
}
```

### 3.2 Obtener Rutas Sin Asignar

```bash
TOKEN="eyJhbGc..."

curl http://localhost:3000/api/rutas/unassigned \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "origen": "Santiago",
    "destino": "Valparaíso",
    "estado": "PENDIENTE",
    "created_at": "2024-01-15T09:00:00Z",
    "clientes": {
      "nombre": "Cliente A"
    }
  }
]
```

### 3.3 Obtener Info de Ruta

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"

curl http://localhost:3000/api/rutas/$RUTA_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "origen": "Santiago",
  "destino": "Valparaíso",
  "estado": "ASIGNADA",
  "fecha_inicio": "2024-01-15T10:00:00Z",
  "fecha_fin": null,
  "clientes": {
    "nombre": "Cliente A"
  },
  "conductores": {
    "rut": "12.345.678-9",
    "licencia_vencimiento": "2025-12-31"
  },
  "camiones": {
    "patente": "ABCD-1234",
    "capacidad_kg": 5000
  },
  "licenseStatus": {
    "isValid": true,
    "status": "VALID"
  }
}
```

### 3.4 Cambiar Estado de Ruta

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"
NUEVO_ESTADO="EN_PROCESO"

curl -X PATCH http://localhost:3000/api/rutas/$RUTA_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado": "'$NUEVO_ESTADO'"}'
```

**Estados válidos:** `PENDIENTE`, `ASIGNADA`, `EN_PROCESO`, `ENTREGADA`, `CANCELADA`

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Ruta actualizada a estado: EN_PROCESO",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "estado": "EN_PROCESO",
    "fecha_inicio": "2024-01-15T10:00:00Z"
  }
}
```

### 3.5 Listar Rutas con Filtros

```bash
TOKEN="eyJhbGc..."

# Sin filtros
curl "http://localhost:3000/api/rutas" \
  -H "Authorization: Bearer $TOKEN"

# Con filtro de estado
curl "http://localhost:3000/api/rutas?estado=EN_PROCESO" \
  -H "Authorization: Bearer $TOKEN"

# Con filtro de conductor
curl "http://localhost:3000/api/rutas?conductorId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"

# Múltiples filtros
curl "http://localhost:3000/api/rutas?estado=ASIGNADA&conductorId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4️⃣ ENTREGAS - Endpoints

### 4.1 Cerrar Entrega

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"
CLIENTE_EMAIL="cliente@example.com"

curl -X POST http://localhost:3000/api/entregas/$RUTA_ID/close \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clienteEmail": "'$CLIENTE_EMAIL'"}'
```

**Respuesta (201) - Éxito:**
```json
{
  "success": true,
  "message": "Entrega cerrada exitosamente",
  "data": {
    "rutaId": "550e8400-e29b-41d4-a716-446655440010",
    "pdfUrl": "https://xxx.supabasecdn.co/comprobantes/...",
    "emailEnviadoA": "cliente@example.com",
    "clienteNombre": "Cliente A"
  }
}
```

### 4.2 Guardar Firma

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"

# Obtener base64 de firma desde Canvas/Signature Pad
# Ejemplo: data:image/png;base64,iVBORw0KGgo...

curl -X POST http://localhost:3000/api/entregas/$RUTA_ID/signature \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"base64Signature": "data:image/png;base64,iVBORw0KGgo..."}'
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Firma guardada exitosamente",
  "data": {
    "rutaId": "550e8400-e29b-41d4-a716-446655440010",
    "firmaUrl": "https://xxx.supabasecdn.co/firmas/..."
  }
}
```

### 4.3 Guardar Foto

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"

curl -X POST http://localhost:3000/api/entregas/$RUTA_ID/photo \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"base64Photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."}'
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Foto guardada exitosamente",
  "data": {
    "rutaId": "550e8400-e29b-41d4-a716-446655440010",
    "fotoUrl": "https://xxx.supabasecdn.co/fichas_despacho/..."
  }
}
```

### 4.4 Obtener Estado de Entrega

```bash
TOKEN="eyJhbGc..."
RUTA_ID="550e8400-e29b-41d4-a716-446655440010"

curl http://localhost:3000/api/entregas/$RUTA_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "ruta_id": "550e8400-e29b-41d4-a716-446655440010",
  "validado": true,
  "firma_url": "https://xxx.supabasecdn.co/firmas/...",
  "foto_url": "https://xxx.supabasecdn.co/fichas_despacho/...",
  "estado": "ENTREGADA",
  "fecha_entrega_real": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

## ❌ Códigos de Error Comunes

| Código | Significado | Solución |
|--------|-------------|----------|
| 200 | OK | Éxito ✅ |
| 201 | Created | Recurso creado ✅ |
| 400 | Bad Request | Validación fallida, revisa el JSON |
| 401 | Unauthorized | JWT falta o es inválido, obtén uno nuevo |
| 403 | Forbidden | Acción no permitida (ej: licencia vencida) |
| 404 | Not Found | Recurso no existe |
| 500 | Server Error | Error en backend, revisa logs |

---

## 📄 Colecciones Postman/Insomnia

### Importar Colección (JSON)

```json
{
  "info": {
    "name": "LogiTrack Backend API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Upload License",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/conductores/upload-license",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {"key": "file", "value": ""},
            {"key": "expiryDate", "value": "2025-12-31"}
          ]
        }
      }
    },
    {
      "name": "Validate License",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/conductores/{{conductorId}}/license-status",
        "header": [
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ]
      }
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000"},
    {"key": "token", "value": ""},
    {"key": "conductorId", "value": ""}
  ]
}
```

---

## 🎬 Flujo de Testing Completo

```bash
# 1. Verificar que backend está activo
curl http://localhost:3000/health

# 2. Obtener token (hacer login en frontend)
TOKEN="..."

# 3. Validar licencia de un conductor
curl http://localhost:3000/api/conductores/CONDUCTOR_ID/license-status \
  -H "Authorization: Bearer $TOKEN"

# 4. Si es válida, asignar a una ruta
curl -X POST http://localhost:3000/api/rutas/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rutaId": "RUTA_ID",
    "conductorId": "CONDUCTOR_ID",
    "camionId": "CAMION_ID"
  }'

# 5. Cambiar estado
curl -X PATCH http://localhost:3000/api/rutas/RUTA_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado": "EN_PROCESO"}'

# 6. Guardar firma
curl -X POST http://localhost:3000/api/entregas/RUTA_ID/signature \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"base64Signature": "data:image/png;base64,..."}'

# 7. Cerrar entrega
curl -X POST http://localhost:3000/api/entregas/RUTA_ID/close \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clienteEmail": "cliente@example.com"}'
```

---

**¡Listo para probar!** 🚀
