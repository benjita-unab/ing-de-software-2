import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AuthSpacing, AuthTypography } from '@/src/constants/authTheme';
import { useAuthTheme } from '@/src/hooks/use-auth-theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type AuthButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
};

export function AuthButton({
  title,
  loading = false,
  variant = 'primary',
  fullWidth = true,
  disabled,
  style,
  ...rest
}: AuthButtonProps) {
  const { colors } = useAuthTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={(state) => {
        const extra: StyleProp<ViewStyle> =
          typeof style === 'function' ? style(state) : style;
        return [
          styles.base,
          fullWidth && styles.fullWidth,
          isGhost && styles.ghost,
          !isGhost && styles.solid,
          {
            backgroundColor: isGhost
              ? 'transparent'
              : isPrimary
                ? colors.primary
                : colors.secondary,
            borderColor: isGhost
              ? 'transparent'
              : isPrimary
                ? colors.primary
                : colors.secondaryBorder,
            opacity: state.pressed || disabled || loading ? 0.88 : 1,
          },
          extra,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator
          color={isGhost ? colors.link : isPrimary ? colors.primaryText : colors.secondaryText}
        />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: isGhost
                ? colors.link
                : isPrimary
                  ? colors.primaryText
                  : colors.secondaryText,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: AuthSpacing.buttonMinHeight,
    borderRadius: AuthSpacing.radiusButton,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
  solid: { borderWidth: 1 },
  ghost: { borderWidth: 0, minHeight: 48 },
  label: AuthTypography.button,
});
