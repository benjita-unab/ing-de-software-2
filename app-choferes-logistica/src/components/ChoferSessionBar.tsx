import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';

/** UUID de ruta activa persistido en Home (se limpia al cerrar sesión). */
export const STORAGE_RUTA_ACTIVA_ID = 'logitrack_ruta_activa_id';

/**
 * Barra superior en el portal chofer: correo de sesión + cerrar sesión.
 */
export function ChoferSessionBar() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: Math.max(insets.top, 8),
        },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.kicker}>LogiTrack · Chofer</Text>
        <Text style={styles.email} numberOfLines={1}>
          {session?.email ?? 'Sesión activa'}
        </Text>
      </View>
      <SignOutButton extraStorageKeys={[STORAGE_RUTA_ACTIVA_ID]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    zIndex: 60,
    elevation: 8,
  },
  textBlock: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, fontWeight: '600', color: '#64748b', letterSpacing: 0.3 },
  email: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
});
