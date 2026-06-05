import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';

type SignOutButtonProps = {
  /** Claves AsyncStorage adicionales a borrar al cerrar sesión (p. ej. ruta activa local). */
  extraStorageKeys?: string[];
  variant?: 'light' | 'dark';
};

/**
 * Cierra sesión: limpia token y accessKind (authSession), actualiza AuthContext y va a /auth.
 */
export function SignOutButton({
  extraStorageKeys = [],
  variant = 'light',
}: SignOutButtonProps) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      if (extraStorageKeys.length > 0) {
        await AsyncStorage.multiRemove(extraStorageKeys);
      }
      router.replace('/auth' as never);
    } finally {
      setLoading(false);
    }
  }

  const isDark = variant === 'dark';

  return (
    <Pressable
      onPress={() => void handlePress()}
      disabled={loading}
      style={({ pressed }) => [
        styles.btn,
        isDark ? styles.btnDark : styles.btnLight,
        (pressed || loading) && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDark ? '#f8fafc' : '#b91c1c'} />
      ) : (
        <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>
          Cerrar sesión
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLight: {
    borderColor: '#fecaca',
    backgroundColor: '#fff',
  },
  btnDark: {
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  pressed: { opacity: 0.85 },
  label: { fontSize: 14, fontWeight: '600' },
  labelLight: { color: '#b91c1c' },
  labelDark: { color: '#f8fafc' },
});
