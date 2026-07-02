import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

/** UUID de ruta activa persistido en Home (se limpia al cerrar sesión). */
export const STORAGE_RUTA_ACTIVA_ID = 'logitrack_ruta_activa_id';

/**
 * Barra superior en el portal chofer: correo de sesión + cerrar sesión y opcionalmente un botón de refrescar.
 */
export function ChoferSessionBar({ onRefresh }: { onRefresh?: () => void }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  
  // Extraemos nombre del correo para simular el "Hello Sarah"
  const choferName = session?.email ? session.email.split('@')[0] : 'Chofer';
  const displayName = choferName.charAt(0).toUpperCase() + choferName.slice(1);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: Math.max(insets.top, 24),
        },
      ]}
    >
      <View style={styles.topActionsRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {onRefresh && (
            <Ionicons 
              name="refresh" 
              size={24} 
              color="#0F172A" 
              onPress={onRefresh} 
              style={{ padding: 4 }}
            />
          )}
          <SignOutButton extraStorageKeys={[STORAGE_RUTA_ACTIVA_ID]} />
        </View>
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.kicker}>Hola {displayName}</Text>
        <Text style={styles.email} numberOfLines={1}>
          No hay alertas pendientes por ahora
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
    zIndex: 60,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 24,
  },
  pillAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  textBlock: { 
    minWidth: 0,
  },
  kicker: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: -0.5,
  },
  email: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: '#94A3B8', 
    marginTop: 6 
  },
});
