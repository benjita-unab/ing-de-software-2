export type JwtRole = 'ADMIN' | 'OPERADOR' | 'CONDUCTOR' | 'CLIENTE' | string;

export interface DecodedJwt {
  sub?: string;
  email?: string;
  role?: JwtRole;
  clienteId?: string;
  conductorId?: string;
}

export function decodeJwtPayload(token: string): DecodedJwt | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as DecodedJwt;
  } catch {
    return null;
  }
}

export function normalizeJwtRole(role?: string): string {
  const r = String(role || '').toUpperCase();
  if (r === 'MOBILE' || r === 'OPERATOR') return 'OPERADOR';
  return r;
}
