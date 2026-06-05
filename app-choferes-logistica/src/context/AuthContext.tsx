import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    accessKind: AccessKind,
  ) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const stored = await getStoredSession();
    setSession(stored);
  }, []);

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
      return next;
    },
    [],
  );

  /** Borra token y accessKind en AsyncStorage; la UI debe redirigir a /auth. */
  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, signIn, signOut, refreshSession }),
    [session, isLoading, signIn, signOut, refreshSession],
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
