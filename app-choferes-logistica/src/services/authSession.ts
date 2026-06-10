import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  decodeJwtPayload,
  normalizeJwtRole,
  type DecodedJwt,
} from '@/src/utils/jwt';
import { mapLoginHttpError, mapNetworkLoginError } from '@/src/utils/authErrors';

export const TOKEN_KEY = 'logitrack_access_token';
export const SESSION_ROLE_KEY = 'logitrack_session_role';

export type AccessKind = 'cliente' | 'chofer';

export interface AuthSession {
  accessToken: string;
  role: string;
  email: string;
  userId: string;
  clienteId?: string;
  conductorId?: string;
  accessKind: AccessKind;
}

function requiredApiUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl?.trim()) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_URL en app-choferes-logistica/.env',
    );
  }
  return baseUrl.replace(/\/$/, '').replace(/\/api$/, '');
}

function sessionFromToken(
  accessToken: string,
  accessKind: AccessKind,
): AuthSession | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.sub || !payload.email) return null;

  const role = normalizeJwtRole(payload.role);
  return {
    accessToken,
    role,
    email: String(payload.email),
    userId: String(payload.sub),
    clienteId: payload.clienteId,
    conductorId: payload.conductorId,
    accessKind,
  };
}

/** Lee el cuerpo JSON o texto plano (p. ej. HTML de Cloudflare en errores 530). */
async function readLoginResponseBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 280) };
  }
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredSession(): Promise<AuthSession | null> {
  const token = await getStoredToken();
  const accessKind = (await AsyncStorage.getItem(
    SESSION_ROLE_KEY,
  )) as AccessKind | null;
  if (!token || (accessKind !== 'cliente' && accessKind !== 'chofer')) {
    return null;
  }
  return sessionFromToken(token, accessKind);
}

export async function persistSession(session: AuthSession): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, session.accessToken],
    [SESSION_ROLE_KEY, session.accessKind],
  ]);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, SESSION_ROLE_KEY]);
}

/**
 * Login contra POST /api/auth/login (tabla public.usuarios).
 * Correcciones: email en minúsculas, parseo de errores NestJS, mensajes por HTTP 401/403/5xx/530.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
  accessKind: AccessKind,
  expectedRole: 'CLIENTE' | 'CONDUCTOR',
): Promise<AuthSession> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password;

  if (!trimmedEmail) {
    throw new Error('Ingresa tu correo electrónico.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('Ingresa un correo válido.');
  }
  if (!trimmedPassword) {
    throw new Error('Ingresa tu contraseña.');
  }

  const url = `${requiredApiUrl()}/api/auth/login`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        password: trimmedPassword,
      }),
    });
  } catch (networkErr) {
    throw new Error(mapNetworkLoginError(networkErr));
  }

  const body = await readLoginResponseBody(response);

  if (!response.ok) {
    throw new Error(mapLoginHttpError(response.status, body));
  }

  const accessToken = (body as { accessToken?: string })?.accessToken;
  if (!accessToken) {
    throw new Error('El servidor no devolvió accessToken. Revisa el backend.');
  }

  const session = sessionFromToken(accessToken, accessKind);
  if (!session) {
    throw new Error('No se pudo leer el JWT (sub/email/role).');
  }

  if (session.role !== expectedRole) {
    throw new Error(
      expectedRole === 'CONDUCTOR'
        ? 'Esta cuenta no tiene rol CONDUCTOR. Usa el acceso correcto o contacta al administrador.'
        : 'Esta cuenta no tiene rol CLIENTE. Usa el acceso de cliente o contacta al administrador.',
    );
  }

  if (expectedRole === 'CONDUCTOR' && !session.conductorId) {
    throw new Error(
      'Tu usuario no está vinculado a un conductor (conductores.usuario_id). Contacta al administrador.',
    );
  }

  if (expectedRole === 'CLIENTE' && !session.clienteId) {
    throw new Error(
      'Tu usuario no está vinculado a un cliente (clientes.usuario_id). Contacta al administrador.',
    );
  }

  await persistSession(session);
  return session;
}
