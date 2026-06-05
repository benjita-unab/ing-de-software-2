import { router } from 'expo-router';
import React, { useState } from 'react';
import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { useAuth } from '@/src/context/AuthContext';

export default function AuthClienteScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password, 'cliente');
      router.replace('/cliente' as never);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <LoginForm
        portalTitle="Portal Cliente"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        onBack={() => router.replace('/auth' as never)}
      />
    </AuthScreenLayout>
  );
}
