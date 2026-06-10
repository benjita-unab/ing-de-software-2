/**
 * Normaliza mensajes de error del backend NestJS (message string | string[]).
 */
export function extractApiMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.message)) {
    const parts = record.message.map((m) => String(m).trim()).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }
  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error.trim();
  }
  return undefined;
}

/**
 * Mensajes claros por código HTTP para login (evita textos genéricos tipo "Error 530").
 */
export function mapLoginHttpError(status: number, body: unknown): string {
  const fromBody = extractApiMessage(body);

  if (status === 401) {
    return fromBody ?? 'Credenciales inválidas. Verifica tu correo y contraseña.';
  }
  if (status === 403) {
    return (
      fromBody ??
      'Usuario sin vínculo con conductor o cliente. Contacta al administrador.'
    );
  }
  if (status === 404) {
    return 'No se encontró el servicio de login. Revisa EXPO_PUBLIC_API_URL.';
  }
  if (status === 502 || status === 503 || status === 530) {
    return (
      fromBody ??
      'El servidor no está disponible. Verifica que el túnel o backend esté activo.'
    );
  }
  if (status >= 500) {
    return fromBody ?? 'Error interno del servidor. Intenta nuevamente más tarde.';
  }
  if (status === 0) {
    return 'Sin conexión al servidor. Revisa tu red y la URL del API.';
  }

  return fromBody ?? `No fue posible iniciar sesión (HTTP ${status}).`;
}

export function mapNetworkLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (/network request failed|failed to fetch|network/i.test(error.message)) {
      return 'Sin conexión al servidor. Revisa EXPO_PUBLIC_API_URL y tu red.';
    }
    return error.message;
  }
  return 'Error de red al intentar iniciar sesión.';
}
