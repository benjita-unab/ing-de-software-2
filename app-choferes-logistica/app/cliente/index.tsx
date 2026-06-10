import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogiTrackLogo } from '@/src/components/auth/LogiTrackLogo';
import { SignOutButton } from '@/src/components/SignOutButton';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthSpacing } from '@/src/constants/authTheme';

/** Área mínima post-login cliente (portal web es el destino principal). */
export default function ClienteHomeScreen() {
  const { session } = useAuth();
  const { colors } = useAuthTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <LogiTrackLogo portalTitle="Portal Cliente" />
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Sesión iniciada como {session?.email ?? 'cliente'}.
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          El seguimiento completo de pedidos está disponible en el portal web LogiTrack.
        </Text>
        <SignOutButton />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    padding: AuthSpacing.screenPadding,
    gap: 16,
    justifyContent: 'center',
  },
  body: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
});
