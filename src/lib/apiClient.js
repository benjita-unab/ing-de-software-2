// src/lib/apiClient.js
// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP del frontend web. Expone helpers de auth (token + login)
// para que los hooks (useAlerts, etc.) no tengan que duplicar lógica.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY_PRIMARY = 'accessToken';
const TOKEN_KEY_LEGACY = 'logitrack_access_token';

function getApiBaseUrl() {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '').replace(/\/api$/, '');
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
