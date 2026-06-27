import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  getStoredSession,
  loginWithCredentials,
  type AccessKind,
  type AuthSession,
} from '@/src/services/authSession';

export interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  licenseStatus: any | null;
  signIn: (
    email: string,
    password: string,
    accessKind: AccessKind,
  ) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshLicenseStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<any | null>(null);
  const [isFetchingLicense, setIsFetchingLicense] = useState(false);
  const sessionRef = useRef<AuthSession | null>(null);
  const isFetchingLicenseRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshLicenseStatus = useCallback(async (currentSession?: AuthSession | null) => {
    const activeSession = currentSession ?? sessionRef.current;

    if (!(activeSession?.accessKind === 'chofer' && activeSession?.conductorId)) {
      setLicenseStatus(null);
      return;
    }

    if (isFetchingLicenseRef.current) {
      return;
    }

    isFetchingLicenseRef.current = true;
    setIsFetchingLicense(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
      const url = `${baseUrl}/api/conductores/${activeSession.conductorId}/license-status`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${activeSession.accessToken}`,
        },
      });

      const rawText = await response.text();
      let data: any = {};

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          console.error('Error parsing license status JSON:', parseErr);
          data = {};
        }
      }

      if (!response.ok) {
        const message =
          (typeof data?.error === 'string' && data.error) ||
          (typeof data?.message === 'string' && data.message) ||
          'No se pudo obtener el estado de la licencia';
        throw new Error(message);
      }

      setLicenseStatus(data);
    } catch (err) {
      console.error('Error fetching license status:', err);
    } finally {
      isFetchingLicenseRef.current = false;
      setIsFetchingLicense(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = await getStoredSession();
    sessionRef.current = stored;
    setSession(stored);
    if (stored) await refreshLicenseStatus(stored);
  }, [refreshLicenseStatus]);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const signIn = useCallback(
    async (email: string, password: string, accessKind: AccessKind) => {
      const expectedRole = accessKind === 'chofer' ? 'CONDUCTOR' : 'CLIENTE';
      // Persiste token + tipo de acceso en AsyncStorage vía authSession.
      const next = await loginWithCredentials(
        email,
        password,
        accessKind,
        expectedRole,
      );
      setSession(next);
      sessionRef.current = next;
      await refreshLicenseStatus(next);
      return next;
    },
    [refreshLicenseStatus],
  );

  /** Borra token y accessKind en AsyncStorage; la UI debe redirigir a /auth. */
  const signOut = useCallback(async () => {
    await clearSession();
    sessionRef.current = null;
    setSession(null);
    setLicenseStatus(null);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, licenseStatus, signIn, signOut, refreshSession, refreshLicenseStatus }),
    [session, isLoading, licenseStatus, signIn, signOut, refreshSession, refreshLicenseStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
