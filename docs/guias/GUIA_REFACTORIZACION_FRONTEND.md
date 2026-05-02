# 🔄 Guía de Refactorización del Frontend

Esta guía muestra cómo migrar el código actual del Frontend para que use los nuevos endpoints del Backend centralizado.

---

## 📍 Antes vs. Después

### ❌ ANTES: Acceso directo a Supabase desde Frontend

```javascript
// src/components/LicenseUploadForm.jsx (ANTIGUO - NO RECOMENDADO)
const handleUpload = async (e) => {
  const { data: storageData, error: storageError } = await supabaseClient
    .storage
    .from('driver_licenses')
    .upload(filePath, file);
    
  const { data: dbData, error: dbError } = await supabaseClient
    .from('driver_licenses')
    .insert({...});
};
```

**Problemas:**
- 🔴 Lógica de negocio en el cliente
- 🔴 Service Role Key expuesta
- 🔴 Sin auditoría centralizada
- 🔴 Sin validaciones del lado servidor

---

### ✅ DESPUÉS: Usar Backend API

```javascript
// src/lib/apiClient.js (NUEVO - RECOMENDADO)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const apiClient = {
  async uploadLicense(file, expiryDate, token) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expiryDate', expiryDate);

    const response = await fetch(
      `${API_URL}/api/conductores/upload-license`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  },

  async validateLicense(conductorId, token) {
    const response = await fetch(
      `${API_URL}/api/conductores/${conductorId}/license-status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.json();
  },

  async assignDriverToRoute(rutaId, conductorId, camionId, token) {
    const response = await fetch(`${API_URL}/api/rutas/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        rutaId,
        conductorId,
        camionId,
      }),
    });

    return response.json();
  },

  async closeDelivery(rutaId, clienteEmail, token) {
    const response = await fetch(
      `${API_URL}/api/entregas/${rutaId}/close`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ clienteEmail }),
      }
    );

    return response.json();
  },

  async saveSignature(rutaId, base64Signature, token) {
    const response = await fetch(
      `${API_URL}/api/entregas/${rutaId}/signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ base64Signature }),
      }
    );

    return response.json();
  },

  async savePhoto(rutaId, base64Photo, token) {
    const response = await fetch(
      `${API_URL}/api/entregas/${rutaId}/photo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ base64Photo }),
      }
    );

    return response.json();
  },
};
```

---

## 🔄 Refactorización por Componente

### 1️⃣ LicenseUploadForm.jsx

**ANTES:**
```javascript
const handleUpload = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsLoading(true);
  
  try {
    const currentUserId = 'chofer-prueba-123';
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `licenses/${currentUserId}/${fileName}`;
    
    const { data, error } = await supabase
      .storage
      .from('driver_licenses')
      .upload(filePath, file);
    
    if (error) throw error;
    
    // ... más lógica
  } catch (error) {
    setErrors({ submit: error.message });
  }
};
```

**DESPUÉS:**
```javascript
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';

const LicenseUploadForm = () => {
  const { user, session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    if (!session?.access_token) {
      setErrors({ submit: 'No estás autenticado' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await apiClient.uploadLicense(
        file,
        expiryDate,
        session.access_token
      );

      setSuccessMessage('¡Licencia subida exitosamente!');
      setFile(null);
      setExpiryDate('');
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // JSX igual, solo cambió la lógica de handleUpload
  );
};
```

---

### 2️⃣ AsignacionRutas.jsx

**ANTES:**
```javascript
import { 
  obtenerRutasSinAsignar,
  asignarConductorARuta,
  obtenerEstadoLicencia 
} from "../lib/rutasService";

const cargarEstadoLicencia = async (conductorId) => {
  const result = await obtenerEstadoLicencia(conductorId);
  setEstadoLicencia(result);
};

const asignarConductor = async () => {
  const result = await asignarConductorARuta(
    rutaSeleccionada,
    conductorSeleccionado,
    camionSeleccionado
  );
};
```

**DESPUÉS:**
```javascript
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

const AsignacionRutas = () => {
  const { session } = useAuth();

  const cargarEstadoLicencia = async (conductorId) => {
    try {
      const result = await apiClient.validateLicense(
        conductorId,
        session.access_token
      );
      setEstadoLicencia(result);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    }
  };

  const asignarConductor = async () => {
    if (!session?.access_token) {
      setMensaje({ tipo: 'error', texto: 'No autenticado' });
      return;
    }

    try {
      const result = await apiClient.assignDriverToRoute(
        rutaSeleccionada,
        conductorSeleccionado,
        camionSeleccionado,
        session.access_token
      );
      
      setMensaje({ 
        tipo: 'success', 
        texto: 'Conductor asignado exitosamente' 
      });
      
      // Recargar rutas
      cargarDatos();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    }
  };
};
```

---

### 3️⃣ cierreDespachoService.ts (Mobile)

**ANTES:**
```typescript
export async function cerrarDespachoYEnviarComprobante(
  rutaId: string
): Promise<CierreDespachoResultado> {
  const pdf = await generarComprobantePDF(id);
  
  // Correo forzado (problema de seguridad)
  const email = "oyanadelbastian5@gmail.com";

  await enviarComprobanteEmail(
    String(email).trim(),
    pdf.base64,
    pdf.cliente.nombre
  );

  const { data: actualizadas, error: updateError } = await supabase
    .from("entregas")
    .update({ validado: true })
    .eq("ruta_id", id);
}
```

**DESPUÉS:**
```typescript
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

export async function cerrarDespachoYEnviarComprobante(
  rutaId: string,
  accessToken: string
): Promise<CierreDespachoResultado> {
  try {
    const result = await apiClient.closeDelivery(
      rutaId,
      undefined, // El backend usa el email del usuario
      accessToken
    );

    return {
      emailEnviadoA: result.data.emailEnviadoA,
      rutaId: result.data.rutaId,
      nombreCliente: result.data.clienteNombre,
    };
  } catch (error) {
    throw new Error(`Error cerrando entrega: ${error.message}`);
  }
}
```

---

## 🔧 Configuración del Hook useAuth

Asegúrate de que tu hook `useAuth` retorna el token:

```javascript
// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Escuchar cambios
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return {
    session,
    user,
    loading,
    accessToken: session?.access_token,
  };
}
```

---

## 🌍 Configuración de Variables de Entorno

**Frontend Web (.env):**
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SUPABASE_URL=https://jmshzmwhbbufgxgxlpcd.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGc...
```

**Mobile Expo (.env):**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://jmshzmwhbbufgxgxlpcd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 📋 Checklist de Migración

- [ ] Crear archivo `src/lib/apiClient.js` con todas las funciones
- [ ] Actualizar `src/hooks/useAuth.js` para retornar `accessToken`
- [ ] Refactorizar `LicenseUploadForm.jsx`
- [ ] Refactorizar `AsignacionRutas.jsx`
- [ ] Refactorizar `cierreDespachoService.ts`
- [ ] Actualizar `rutasService.js` para usar endpoints
- [ ] Actualizar `.env` con `REACT_APP_API_URL`
- [ ] Probar todos los endpoints
- [ ] Eliminar código antiguo de Supabase directo
- [ ] Actualizar documentación

---

## ✅ Ventajas de la Refactorización

| Aspecto | ANTES | DESPUÉS |
|--------|-------|---------|
| Seguridad | 🔴 Claves expuestas | ✅ Secretos en backend |
| Auditoría | 🔴 No centralizada | ✅ En un solo lugar |
| Validaciones | 🔴 Byp aseable | ✅ Aplicadas en servidor |
| Mantenimiento | 🔴 Código disperso | ✅ Centralizado |
| Escalabilidad | 🔴 Difícil de cambiar | ✅ Fácil de evolucionar |

---

## 🐛 Errores Comunes

### ❌ "Token inválido o expirado"

Solución: Asegúrate de pasar el `access_token` correcto desde `session`:

```javascript
// ✅ CORRECTO
const result = await apiClient.uploadLicense(
  file,
  expiryDate,
  session.access_token  // Token de Supabase
);

// ❌ INCORRECTO
const result = await apiClient.uploadLicense(
  file,
  expiryDate,
  supabaseAnonKey  // Esto no es un token
);
```

### ❌ "No autenticado"

Solución: Verifica que el usuario está logged in:

```javascript
if (!session?.access_token) {
  // Redirigir a login
  navigate('/login');
  return;
}
```

### ❌ CORS error

Solución: Configura `FRONTEND_URL` en el `.env` del backend

---

## 📚 Referencias

- [API del Backend](../../backend/README.md)
- [Documentación de Arquitectura](../arquitectura/ARQUITECTURA_BACKEND.md)
- [Fetch API](https://developer.mozilla.org/es/docs/Web/API/Fetch_API)

