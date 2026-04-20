# 🚀 Guía Rápida: HU-5 / CA-2 - Alertas de Licencias

## ⚡ Start Rápido (3 minutos)

```bash
# 1. Instalar
cd backend
npm install

# 2. Configurar
cp .env.example .env
# ← Edita .env con tus credenciales de Supabase

# 3. Ejecutar
npm run dev
```

**Esperado:** ✅ Servidor en puerto 3001 + Cron iniciado

---

## 🔑 Credenciales Supabase

1. Ve a: https://supabase.com/dashboard
2. Settings → API
3. Copia:
   - `Project URL` → SUPABASE_URL en .env
   - `Service Role Secret` → SUPABASE_SERVICE_KEY en .env

---

## 🧪 Test Rápido

### Verificar servidor

```bash
curl http://localhost:3001/health
```

### Ejecutar verificación ahora

```bash
curl -X POST http://localhost:3001/api/license-alerts/check-now
```

---

## 📊 ¿Qué hace exactamente?

**Diariamente a las 00:00:**

1. Calcula: Hoy + 30 días
2. Consulta: `SELECT * FROM conductores WHERE licencia_vencimiento = [date]`
3. Para cada conductor:
   - ✅ Verifica si ya existe alerta (no duplicados)
   - ➕ Inserta en tabla `incidencias` con:
     - `tipo = 'ALERTA'`
     - `estado = 'pendiente'`
     - `prioridad = 'media'`
     - `descripcion = "La licencia del conductor con ID [user_id] vencerá en 30 días."`

---

## 📁 Archivos Creados

```
backend/
├── package.json                    # npm install
├── .env.example                    # Copiar a .env
├── .env                            # Tu archivo (NO commitear)
├── README.md                       # Documentación
├── HU-5-GUIA-COMPLETA.md         # Guía detallada
└── src/
    ├── server.js                   # ← Servidor principal
    ├── services/
    │   └── licenseAlertService.js  # ← Lógica HU-5
    └── examples/
        └── manualUsageExample.js   # Ejemplos de uso
```

---

## 🎯 Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | ¿Está vivo? |
| `/api/license-alerts/status` | GET | Estado del sistema |
| `/api/license-alerts/check-now` | POST | Test manual |

---

## 🕐 Expresiones Cron Comunes

- `0 0 * * *` → Medianoche diaria ⭐
- `0 2 * * *` → 02:00 AM diaria
- `0 */6 * * *` → Cada 6 horas
- `30 9 * * 1` → Lunes 09:30
- `* * * * *` → Cada minuto (solo testing)

Más: https://crontab.guru/

---

## ⚠️ Errores Comunes

### "Faltan variables de entorno"
```bash
cp .env.example .env
# Edita .env
```

### "No rows found"
Normal si no hay licencias vencidas en 30 días.

### "Ya existe alerta"
El sistema evita duplicados automáticamente (comportamiento correcto).

---

## 📞 Próximos Pasos

- [ ] Instalar dependencias: `npm install`
- [ ] Crear archivo `.env`
- [ ] Completar credenciales Supabase
- [ ] Ejecutar: `npm run dev`
- [ ] Probar: `curl http://localhost:3001/health`
- [ ] Verificar logs para confirmar cron iniciado

---

## 📚 Documentación Completa

- **Guía Detallada:** [HU-5-GUIA-COMPLETA.md](./HU-5-GUIA-COMPLETA.md)
- **Backend README:** [README.md](./README.md)
- **Ejemplos de Código:** [src/examples/manualUsageExample.js](./src/examples/manualUsageExample.js)

---

**¿Listo? ¡Comienza con `npm run dev`!** 🚀
