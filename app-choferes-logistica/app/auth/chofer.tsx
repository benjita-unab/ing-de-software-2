import { router } from 'expo-router';
import React, { useState } from 'react';
import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { useAuth } from '@/src/context/AuthContext';

export default function AuthChoferScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password, 'chofer');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      // authSession ya traduce 401/403/5xx/530 y errores de red a mensajes claros.
      setError(e instanceof Error ? e.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <LoginForm
        portalTitle="Portal Chofer"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        onBack={() => router.replace('/auth' as never)}
      />
    </AuthScreenLayout>
  );
}
