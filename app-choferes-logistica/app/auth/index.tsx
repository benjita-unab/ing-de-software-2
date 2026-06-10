import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AuthButton } from '@/src/components/auth/AuthButton';
import { AuthScreenLayout } from '@/src/components/auth/AuthScreenLayout';
import { LogiTrackLogo } from '@/src/components/auth/LogiTrackLogo';
import { AuthSpacing } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

export default function AuthIndexScreen() {
  const { colors, scheme } = useAuthTheme();

  const cardShadow =
    scheme === 'light'
      ? {
          shadowColor: '#1A202C',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          elevation: 4,
        }
      : {};

  return (
    <AuthScreenLayout centered>
      <View style={styles.container}>
        <LogiTrackLogo
          showTagline
          helperText="Seleccione el tipo de acceso para continuar"
        />

        <View
          style={[
            styles.actionsCard,
            cardShadow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <AuthButton
            title="Ingresar como Cliente"
            variant="primary"
            onPress={() => router.push('/auth/cliente' as never)}
          />
          <AuthButton
            title="Ingresar como Chofer"
            variant="secondary"
            onPress={() => router.push('/auth/chofer' as never)}
          />
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: AuthSpacing.sectionGap + 8,
    paddingVertical: 12,
  },
  actionsCard: {
    gap: 14,
    padding: AuthSpacing.cardPadding,
    borderRadius: AuthSpacing.radiusLg,
    borderWidth: 1,
    width: '100%',
  },
});
