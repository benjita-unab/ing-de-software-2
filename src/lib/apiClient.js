// src/lib/apiClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP del frontend web. Expone helpers de auth (token + login)
// y un wrapper `apiFetch` para que los hooks/servicios no tengan que
// duplicar lógica de URL base, headers ni manejo de token.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY_PRIMARY = 'accessToken';
const TOKEN_KEY_LEGACY = 'logitrack_access_token';

/**
 * Devuelve la URL base del backend SIN sufijo `/api`.
 * Acepta REACT_APP_API_URL con o sin `/api` para evitar duplicar `/api/api`.
 */
export function getApiBaseUrl() {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';
  return String(raw).replace(/\/+$/, '').replace(/\/api$/, '');
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(TOKEN_KEY_PRIMARY) ||
    localStorage.getItem(TOKEN_KEY_LEGACY) ||
    null
  );
}

export function setAuthToken(token) {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem(TOKEN_KEY_PRIMARY, token);
  localStorage.setItem(TOKEN_KEY_LEGACY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY_PRIMARY);
  localStorage.removeItem(TOKEN_KEY_LEGACY);
}

export async function loginWeb(
  email = 'test@test.com',
  password = '123456',
) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.accessToken) {
    throw new Error(
      data?.message || data?.error || `Login failed (HTTP ${res.status})`,
    );
  }

  setAuthToken(data.accessToken);
  return data.accessToken;
}

/**
 * Wrapper genérico para llamadas al backend autenticadas.
 *
 * @param {string} path - Path absoluto que comienza con `/api/...`.
 * @param {RequestInit & { auth?: boolean, json?: any }} [options]
 *   - `auth`: si es true (default) agrega `Authorization: Bearer <token>`.
 *   - `json`: si se entrega, serializa a JSON y setea Content-Type.
 * @returns {Promise<{ ok: boolean, status: number, data: any, error: string|null }>}
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, json, headers, body, ...rest } = options;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const finalHeaders = { ...(headers || {}) };
  let finalBody = body;

  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(url, { ...rest, headers: finalHeaders, body: finalBody });
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || 'Network error' };
  }

  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error =
      (data && (data.message || data.error)) ||
      `HTTP ${response.status} ${response.statusText}`;
    return { ok: false, status: response.status, data, error };
  }

  return { ok: true, status: response.status, data, error: null };
}
