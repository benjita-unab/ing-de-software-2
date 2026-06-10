import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthSpacing } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';
import { AuthButton } from './AuthButton';
import { AuthInput } from './AuthInput';
import { LogiTrackLogo } from './LogiTrackLogo';

type LoginFormProps = {
  portalTitle: string;
  loading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
  onBack: () => void;
};

export function LoginForm({
  portalTitle,
  loading,
  error,
  onSubmit,
  onBack,
}: LoginFormProps) {
  const { colors, scheme } = useAuthTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function validate(): boolean {
    const next: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = 'El correo es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      next.email = 'Ingresa un correo válido.';
    }
    if (!password) next.password = 'La contraseña es obligatoria.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(email.trim().toLowerCase(), password);
  }

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
    <View style={styles.container}>
      <View style={styles.hero}>
        <LogiTrackLogo portalTitle={portalTitle} compact />
      </View>

      <View
        style={[
          styles.card,
          cardShadow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.errorBg,
                borderColor: colors.error,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <AuthInput
            label="Correo electrónico"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (fieldErrors.email) {
                setFieldErrors((e) => ({ ...e, email: undefined }));
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={fieldErrors.email}
          />
          <AuthInput
            label="Contraseña"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (fieldErrors.password) {
                setFieldErrors((e) => ({ ...e, password: undefined }));
              }
            }}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            error={fieldErrors.password}
          />
        </View>

        <AuthButton title="Iniciar sesión" loading={loading} onPress={handleSubmit} />
      </View>

      <AuthButton title="Volver" variant="ghost" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AuthSpacing.sectionGap,
    width: '100%',
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: AuthSpacing.radiusLg,
    padding: AuthSpacing.cardPadding,
    gap: AuthSpacing.fieldGap,
    width: '100%',
  },
  form: { gap: AuthSpacing.fieldGap },
  errorBox: {
    borderWidth: 1,
    borderRadius: AuthSpacing.radiusMd,
    padding: 16,
  },
  errorText: { fontSize: 14, lineHeight: 22 },
});
