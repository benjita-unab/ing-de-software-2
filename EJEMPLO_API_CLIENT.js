/**
 * API Client para LogiTrack Backend
 * 
 * Archivo de ejemplo que puede ser copiado a: src/lib/apiClient.js
 * 
 * Uso:
 * import { apiClient } from '../lib/apiClient';
 * 
 * const result = await apiClient.uploadLicense(file, expiryDate, token);
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Helper para hacer requests con manejo de errores
 */
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Client API para interactuar con el backend
 */
export const apiClient = {
  // ========== HEALTH CHECK ==========

  async health() {
    return fetch(`${API_URL}/health`).then(r => r.json());
  },

  // ========== CONDUCTORES ==========

  /**
   * Sube la licencia de un conductor
   * @param {File} file - Archivo (PDF, JPG, PNG)
   * @param {string} expiryDate - Fecha de vencimiento (YYYY-MM-DD)
   * @param {string} token - JWT access token de Supabase
   */
  async uploadLicense(file, expiryDate, token) {
    if (!file) throw new Error('File is required');
    if (!expiryDate) throw new Error('Expiry date is required');
    if (!token) throw new Error('Authorization token is required');

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
      throw new Error(error.message || 'Error uploading license');
    }

    return response.json();
  },

  /**
   * Valida el estado de la licencia de un conductor
   * @param {string} conductorId - ID del conductor
   * @param {string} token - JWT access token
   */
  async validateLicense(conductorId, token) {
    if (!conductorId) throw new Error('Conductor ID is required');
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/conductores/${conductorId}/license-status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  /**
   * Obtiene información de un conductor
   * @param {string} conductorId - ID del conductor
   * @param {string} token - JWT access token
   */
  async getDriverInfo(conductorId, token) {
    if (!conductorId) throw new Error('Conductor ID is required');
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/conductores/${conductorId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  /**
   * Lista todos los conductores activos
   * @param {string} token - JWT access token
   */
  async listActiveDrivers(token) {
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/conductores`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  // ========== RUTAS ==========

  /**
   * Asigna un conductor a una ruta
   * @param {string} rutaId - ID de la ruta
   * @param {string} conductorId - ID del conductor
   * @param {string} camionId - ID del camión
   * @param {string} token - JWT access token
   * @param {number} cargaRequeridaKg - Carga requerida (opcional)
   */
  async assignDriverToRoute(rutaId, conductorId, camionId, token, cargaRequeridaKg = 0) {
    if (!rutaId || !conductorId || !camionId) {
      throw new Error('rutaId, conductorId, and camionId are required');
    }
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/rutas/assign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        rutaId,
        conductorId,
        camionId,
        cargaRequeridaKg,
      }),
    });
  },

  /**
   * Obtiene rutas sin asignar
   * @param {string} token - JWT access token
   */
  async getUnassignedRoutes(token) {
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/rutas/unassigned`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  /**
   * Obtiene información de una ruta
   * @param {string} rutaId - ID de la ruta
   * @param {string} token - JWT access token
   */
  async getRouteInfo(rutaId, token) {
    if (!rutaId) throw new Error('Route ID is required');
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/rutas/${rutaId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  /**
   * Actualiza el estado de una ruta
   * @param {string} rutaId - ID de la ruta
   * @param {string} estado - Nuevo estado
   * @param {string} token - JWT access token
   */
  async updateRouteStatus(rutaId, estado, token) {
    if (!rutaId || !estado) {
      throw new Error('rutaId and estado are required');
    }
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/rutas/${rutaId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado }),
    });
  },

  /**
   * Lista rutas con filtros
   * @param {Object} filters - Filtros (estado, conductorId, clienteId)
   * @param {string} token - JWT access token
   */
  async listRoutes(filters, token) {
    if (!token) throw new Error('Authorization token is required');

    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.conductorId) params.append('conductorId', filters.conductorId);
    if (filters?.clienteId) params.append('clienteId', filters.clienteId);

    const queryString = params.toString();
    const url = `/api/rutas${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  // ========== ENTREGAS ==========

  /**
   * Cierra una entrega (genera PDF, envía email)
   * @param {string} rutaId - ID de la ruta
   * @param {string} token - JWT access token
   * @param {string} clienteEmail - Email del cliente (opcional)
   */
  async closeDelivery(rutaId, token, clienteEmail = null) {
    if (!rutaId) throw new Error('Route ID is required');
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/entregas/${rutaId}/close`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...(clienteEmail && { clienteEmail }),
      }),
    });
  },

  /**
   * Guarda la firma de recepción
   * @param {string} rutaId - ID de la ruta
   * @param {string} base64Signature - Firma en base64
   * @param {string} token - JWT access token
   */
  async saveSignature(rutaId, base64Signature, token) {
    if (!rutaId || !base64Signature) {
      throw new Error('rutaId and base64Signature are required');
    }
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/entregas/${rutaId}/signature`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ base64Signature }),
    });
  },

  /**
   * Guarda la foto de ficha de despacho
   * @param {string} rutaId - ID de la ruta
   * @param {string} base64Photo - Foto en base64
   * @param {string} token - JWT access token
   */
  async savePhoto(rutaId, base64Photo, token) {
    if (!rutaId || !base64Photo) {
      throw new Error('rutaId and base64Photo are required');
    }
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/entregas/${rutaId}/photo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ base64Photo }),
    });
  },

  /**
   * Obtiene el estado de una entrega
   * @param {string} rutaId - ID de la ruta
   * @param {string} token - JWT access token
   */
  async getDeliveryStatus(rutaId, token) {
    if (!rutaId) throw new Error('Route ID is required');
    if (!token) throw new Error('Authorization token is required');

    return apiRequest(`/api/entregas/${rutaId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },
};

/**
 * Hook para usar el API client con autenticación automática
 * 
 * Uso:
 * const api = useApi();
 * const result = await api.uploadLicense(file, date);
 */
export function useApi() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Importar supabase aquí para evitar errores de circular dependency
    import('./supabaseClient').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });
    });
  }, []);

  const withAuth = (fn) => (...args) => {
    if (!session?.access_token) {
      throw new Error('User is not authenticated');
    }
    return fn(...args, session.access_token);
  };

  return {
    loading,
    health: apiClient.health,
    uploadLicense: withAuth(apiClient.uploadLicense),
    validateLicense: withAuth(apiClient.validateLicense),
    getDriverInfo: withAuth(apiClient.getDriverInfo),
    listActiveDrivers: withAuth(apiClient.listActiveDrivers),
    assignDriverToRoute: withAuth(apiClient.assignDriverToRoute),
    getUnassignedRoutes: withAuth(apiClient.getUnassignedRoutes),
    getRouteInfo: withAuth(apiClient.getRouteInfo),
    updateRouteStatus: withAuth(apiClient.updateRouteStatus),
    listRoutes: withAuth(apiClient.listRoutes),
    closeDelivery: withAuth(apiClient.closeDelivery),
    saveSignature: withAuth(apiClient.saveSignature),
    savePhoto: withAuth(apiClient.savePhoto),
    getDeliveryStatus: withAuth(apiClient.getDeliveryStatus),
  };
}

export default apiClient;
