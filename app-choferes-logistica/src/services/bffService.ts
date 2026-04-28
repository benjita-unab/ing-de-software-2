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

export async function ensureLoggedIn(): Promise<string | null> {
  try {
    await AsyncStorage.removeItem("logitrack_access_token")
    const existingToken = await getAccessToken();
    if (existingToken) {
      console.log("Token reutilizado");
      console.log("Token obtenido:", existingToken.slice(0, 20));
      return existingToken;
    }

    console.log("Login automático ejecutado");
    await loginBff(DEBUG_EMAIL, DEBUG_PASSWORD);
    const newToken = await getAccessToken();
    if (newToken) {
      console.log("Token obtenido:", newToken.slice(0, 20));
    }
    return newToken;
  } catch (error: any) {
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
    body: JSON.stringify({ email, password })
  });
  console.log("Response status:", response.status);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? "No fue posible iniciar sesión");
  }
  if (payload.accessToken) {
    await saveAccessToken(payload.accessToken);
    // TODO: quitar el log de abajo tras probar en Postman (no dejar el token en consola en producción)
    console.log("TOKEN_POSTMAN_COPY:", payload.accessToken);
  }
  return payload;
}

export async function bffFetch(path: string, init: RequestInit = {}) {
  const token = await ensureLoggedIn();
  const headers = new Headers(init.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = `${requiredApiUrl()}${path}`;
  console.log("Calling API:", url);
  console.log("Token:", token?.slice(0, 20));
  const response = await fetch(url, {
    ...init,
    headers
  });
  console.log("Response status:", response.status);
  return response;
}
