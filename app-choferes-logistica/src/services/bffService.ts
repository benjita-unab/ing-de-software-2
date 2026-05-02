import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "logitrack_access_token";
const DEBUG_EMAIL = process.env.EXPO_PUBLIC_DEBUG_EMAIL || "EMAIL_TEST";
const DEBUG_PASSWORD = process.env.EXPO_PUBLIC_DEBUG_PASSWORD || "PASSWORD_TEST";

function requiredApiUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl || !baseUrl.trim()) {
    throw new Error("Define EXPO_PUBLIC_API_URL para consumir backend-next.");
  }
  return baseUrl.replace(/\/$/, "").replace(/\/api$/, "");
}

export async function saveAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Obtiene token válido. Si force === true, borra el guardado y fuerza login nuevo.
 * Si force === false y hay token en storage, lo reutiliza.
 */
export async function ensureLoggedIn(force = false): Promise<string | null> {
  try {
    if (force) {
      await clearAccessToken();
      console.log("TOKEN EXISTS:", false);
      console.log("Login automático ejecutado");
      await loginBff(DEBUG_EMAIL, DEBUG_PASSWORD);
      const newToken = await getAccessToken();
      console.log("TOKEN EXISTS:", !!newToken);
      return newToken;
    }

    const existingToken = await getAccessToken();
    console.log("TOKEN EXISTS:", !!existingToken);
    if (existingToken) {
      return existingToken;
    }

    console.log("Login automático ejecutado");
    await loginBff(DEBUG_EMAIL, DEBUG_PASSWORD);
    const newToken = await getAccessToken();
    console.log("TOKEN EXISTS:", !!newToken);
    return newToken;
  } catch (error: unknown) {
    console.log("Error en ensureLoggedIn:", error);
    return null;
  }
}

export async function loginBff(email: string, password: string) {
  const url = `${requiredApiUrl()}/api/auth/login`;
  console.log("Calling API:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("API STATUS:", response.status);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error ?? "No fue posible iniciar sesión");
  }
  if ((payload as { accessToken?: string }).accessToken) {
    await saveAccessToken((payload as { accessToken: string }).accessToken);
  }
  return payload;
}

function buildAuthHeaders(init: RequestInit, token: string | null): Headers {
  const headers = new Headers(init.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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
  console.log("Calling API:", url);
  console.log("TOKEN EXISTS:", !!token);
  return fetch(url, { ...init, headers });
}

export async function bffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await ensureLoggedIn(false);
  let response = await performFetch(path, init, token);
  console.log("API STATUS:", response.status);

  if (response.status === 401) {
    console.log("401 detectado, relogueando una vez");
    await clearAccessToken();
    token = await ensureLoggedIn(true);
    response = await performFetch(path, init, token);
    console.log("API STATUS:", response.status);
  }

  return response;
}
