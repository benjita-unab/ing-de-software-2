import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { AuthSpacing, AuthTypography } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

type AuthInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthInput({ label, error, secureTextEntry, ...rest }: AuthInputProps) {
  const { colors, scheme } = useAuthTheme();
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const [focused, setFocused] = useState(false);
  const isPassword = !!secureTextEntry;

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : scheme === 'light'
        ? colors.inputBorder
        : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBg,
            borderColor,
          },
        ]}
      >
        <TextInput
          {...rest}
          secureTextEntry={isPassword ? hidden : false}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={14}
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: AuthTypography.inputLabel,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: AuthSpacing.radiusMd,
    paddingHorizontal: 18,
    minHeight: AuthSpacing.inputMinHeight,
  },
  input: {
    flex: 1,
    ...AuthTypography.input,
    paddingVertical: 16,
  },
  error: AuthTypography.error,
});
