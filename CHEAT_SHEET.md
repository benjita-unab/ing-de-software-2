# 🚀 CHEAT SHEET - Comandos Rápidos

## Terminal 1: Backend

```bash
cd backend
npm run dev
```

Esperado:
```
✅ SUCCESS: 🚀 Servidor corriendo en puerto 3001
✅ SUCCESS: ⏰ Iniciando Cron Job
```

## Terminal 2: Frontend

```bash
npm start
```

Abre automáticamente en `http://localhost:3000`

---

## Testing Rápido

### Verificar Backend
```bash
curl http://localhost:3001/health
```

### Obtener alertas
```bash
curl http://localhost:3001/api/alerts/unread
```

### Ejecutar job manualmente
```bash
curl -X POST http://localhost:3001/api/alerts/run-job
```

### Marcar alerta como leída
```bash
curl -X PUT http://localhost:3001/api/alerts/1/read
```

### Estadísticas
```bash
curl http://localhost:3001/api/alerts/stats
```

---

## Archivos Importantes

| Archivo | Qué cambiar |
|---------|------------|
| `backend/.env` | Agregar SUPABASE_URL y SUPABASE_SERVICE_KEY |
| `.env` (root) | Agregar REACT_APP_BACKEND_URL y credenciales Supabase |
| `src/App.js` | Importar `LicenseMonitoringDashboard` |

---

## Solucionar Problemas

### Backend no conecta
```bash
# Verifica que .env exista y tenga credenciales
cat backend/.env

# Reinicia backend
cd backend && npm run dev
```

### Frontend no ve alertas
```bash
# Verifica que .env exista en raíz
cat .env

# Verifica que REACT_APP_BACKEND_URL sea correcto
# Debe estar en http://localhost:3001
```

### Cron no se ejecuta
```bash
# Prueba manualmente
curl -X POST http://localhost:3001/api/alerts/run-job
```

---

## URLs Importantes

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Supabase: `https://supabase.com`
- API Docs: Ver `backend/README.md`

---

## Componentes

```jsx
// Opción 1: Dashboard Completo
import LicenseMonitoringDashboard from "./components/LicenseMonitoringDashboard";
<LicenseMonitoringDashboard />

// Opción 2: Solo Banner
import LicenseAlertBanner from "./components/LicenseAlertBanner";
import useLicenseAlerts from "./hooks/useLicenseAlerts";

const { alerts, markAsRead } = useLicenseAlerts();
<LicenseAlertBanner alerts={alerts} onMarkAsRead={markAsRead} />
```

---

## Estructura Diaria

```
00:00:00 (Medianoche)
   ↓
Cron Job se ejecuta
   ↓
Busca vencimientos en 30 días
   ↓
Crea alertas
   ↓
Frontend las detecta (próximo polling)
   ↓
Usuario ve notificaciones
```

---

Ver más en: `GUIA_INSTALACION.md` y `RESUMEN_IMPLEMENTACION.md`
