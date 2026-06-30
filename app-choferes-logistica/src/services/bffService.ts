import { getStoredToken, clearSession } from '@/src/services/authSession';

function requiredApiUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl?.trim()) {
    throw new Error('Define EXPO_PUBLIC_API_URL para consumir el backend.');
  }
  return baseUrl.replace(/\/$/, '').replace(/\/api$/, '');
}

function buildAuthHeaders(init: RequestInit, token: string | null): Headers {
  const headers = new Headers(init.headers ?? {});
  const isFormDataBody =
    typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (isFormDataBody) {
    // RN must set multipart boundaries automatically for FormData.
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function performFetch(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<Response> {
  const headers = buildAuthHeaders(init, token);
  const url = `${requiredApiUrl()}${path}`;
  return fetch(url, { ...init, headers });
}

/** Petición autenticada usando el token guardado en AsyncStorage. */
export async function bffFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getStoredToken();
  let response = await performFetch(path, init, token);

  if (response.status === 401) {
    await clearSession();
  }

  return response;
}

/** @deprecated Usar authSession / AuthContext */
export async function getAccessToken(): Promise<string | null> {
  return getStoredToken();
}

/** @deprecated Usar authSession / AuthContext */
export async function clearAccessToken(): Promise<void> {
  await clearSession();
}
