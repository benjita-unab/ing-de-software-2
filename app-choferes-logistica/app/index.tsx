import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

export default function IndexRedirect() {
  const { session, isLoading } = useAuth();
  const { colors } = useAuthTheme();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href={'/auth' as never} />;
  }

  if (session.accessKind === 'cliente' || session.role === 'CLIENTE') {
    return <Redirect href={'/cliente' as never} />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
